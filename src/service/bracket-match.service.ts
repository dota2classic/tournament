import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { RoundEntity } from '../db/entity/round.entity';
import { EventBus } from '@nestjs/cqrs';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { StageEntity } from '../db/entity/stage.entity';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { GroupEntity } from '../db/entity/group.entity';
import { TournamentRepository } from '../repository/tournament.repository';
import { BracketsManager } from 'brackets-manager';
import { Id, Status } from 'brackets-model';
import { MatchmakingMode } from '../gateway/shared-types/matchmaking-mode';
import { LobbyReadyEvent } from '../gateway/events/lobby-ready.event';
import { Dota_Map } from '../gateway/shared-types/dota-map';
import { Dota_GameMode } from '../gateway/shared-types/dota-game-mode';
import { MatchPlayer } from '../gateway/events/room-ready.event';
import { DotaTeam } from '../gateway/shared-types/dota-team';
import { PlayerId } from '../gateway/shared-types/player-id';
import { Dota2Version } from '../gateway/shared-types/dota2version';
import { DotaPatch } from '../gateway/constants/patch';
import { Region } from '../gateway/shared-types/region';

@Injectable()
export class BracketMatchService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    @InjectRepository(RoundEntity)
    private readonly roundEntityRepository: Repository<RoundEntity>,
    private readonly ebus: EventBus,
    @InjectRepository(TournamentParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      TournamentParticipantEntity
    >,
    @InjectRepository(GroupEntity)
    private readonly groupEntityRepository: Repository<GroupEntity>,
    @InjectRepository(StageEntity)
    private readonly stageEntityRepository: Repository<StageEntity>,
    private readonly utilQuery: TournamentRepository,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<
      BracketMatchGameEntity
    >,
    private readonly manager: BracketsManager,
  ) {}

  /**
   * This thing generates MatchGameEntity for a given match id according to best-of-x strategy
   * @param tour
   * @param bracketMatch
   * @param tx - transaction
   */
  public async generateGames(
    tour: TournamentEntity,
    bracketMatch: BracketMatchEntity,
    tx: EntityManager,
  ) {
    const group = await this.groupEntityRepository.findOneBy({
      id: bracketMatch.group_id,
    });

    // BYE case, no need to generate any match
    if (bracketMatch.opponent1 === null || bracketMatch.opponent2 === null) {
      return;
    }

    const round = await this.roundEntityRepository.findOneBy({
      id: bracketMatch.round_id,
    });
    const totalRounds = await this.roundEntityRepository.findBy({
      group_id: bracketMatch.group_id,
    });

    const maxRounds = totalRounds.sort((a, b) => b.number - a.number)[0].number;

    let bestOf: number;
    if (group.number === 3) {
      bestOf = tour.bestOfConfig.grandFinal;
    } else if (round.number === maxRounds) {
      bestOf = tour.bestOfConfig.final;
    } else {
      bestOf = tour.bestOfConfig.round;
    }

    await tx.update(
      BracketMatchEntity,
      {
        id: bracketMatch.id,
      },
      {
        child_count: bestOf,
      },
    );
    for (let i = 1; i <= bestOf; i++) {
      await tx.save(
        BracketMatchGameEntity,
        new BracketMatchGameEntity(
          bracketMatch.id,
          bracketMatch.stage_id,
          i,
          bracketMatch.opponent1,
          bracketMatch.opponent2,
          bracketMatch.status,
        ),
      );
    }
  }

  /**
   * Sets a winner for given MatchGame.
   * @param matchId - match id within tournament
   * @param gameId - gameid of a match
   * @param winnerOpponentId - id of BracketParticipantEntity
   * @param d2cMatchId - id of dota2classic match if it happened
   * @param forfeit - tech lose
   */
  public async setGameWinner(
    matchId: number,
    gameId: string,
    winnerOpponentId: Id,
    d2cMatchId?: number,
    forfeit?: boolean,
  ) {
    const game = await this.manager.storage.selectFirst('match_game', {
      id: gameId,
    });

    if (
      game.opponent1?.id !== winnerOpponentId &&
      game.opponent2?.id !== winnerOpponentId
    ) {
      throw new Error('No such opponent');
    }

    const [winner, loser] =
      game.opponent1?.id === winnerOpponentId
        ? [game.opponent1, game.opponent2]
        : [game.opponent2, game.opponent1];

    winner.result = 'win';

    await this.manager.update.matchGame<BracketMatchGameEntity>({
      id: gameId,
      parent_id: matchId,
      externalMatchId: d2cMatchId,
      opponent1: game.opponent1,
      opponent2: game.opponent2,
    });
  }

  public async submitGameToLaunch(gameId: string) {
    const game = await this.matchGameEntityRepository.findOneBy({ id: gameId });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    if (game.status !== Status.Ready) {
      throw new BadRequestException('Game is not ready to be played!');
    }

    const players: MatchPlayer[] = [];

    const participants = await Promise.all(
      [game.opponent1, game.opponent2].map(it =>
        this.bracketParticipantEntityRepository.findOne({
          where: {
            id: Number(it.id),
          },
          relations: ['players'],
        }),
      ),
    );

    const dotaTeams =
      game.teamOffset === 0
        ? [DotaTeam.RADIANT, DotaTeam.DIRE]
        : [DotaTeam.DIRE, DotaTeam.RADIANT];

    const teams = participants.map((part, idx) => {
      for (let player of part.players) {
        players.push({
          playerId: new PlayerId(player.steamId),
          team: dotaTeams[idx],
          partyId: player.steamId,
        });
      }
    });

    // TODO: we need extract those settings into tournament stuff
    this.ebus.publish(
      new LobbyReadyEvent(
        gameId,
        MatchmakingMode.TOURNAMENT,
        Dota_Map.DOTA,
        Dota_GameMode.SOLOMID,
        players,
        Dota2Version.Dota_684,
        false,
        false,
        DotaPatch.DOTA_684,
        Region.RU_MOSCOW,
      ),
    );
  }
}
