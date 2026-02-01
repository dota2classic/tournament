import { Injectable, Logger } from '@nestjs/common';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { RoundEntity } from '../db/entity/round.entity';
import { EventBus } from '@nestjs/cqrs';
import { ParticipantEntity } from '../db/entity/participant.entity';
import { StageEntity } from '../db/entity/stage.entity';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { GroupEntity } from '../db/entity/group.entity';
import { TournamentRepository } from '../repository/tournament.repository';
import { BracketsManager } from 'brackets-manager';
import { Id } from 'brackets-model';
import { MatchScheduleService } from './match-schedule.service';

@Injectable()
export class BracketMatchService {
  private logger = new Logger(BracketMatchService.name);

  constructor(
    private readonly ds: DataSource,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<BracketMatchEntity>,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    @InjectRepository(RoundEntity)
    private readonly roundEntityRepository: Repository<RoundEntity>,
    private readonly ebus: EventBus,
    @InjectRepository(ParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<ParticipantEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupEntityRepository: Repository<GroupEntity>,
    @InjectRepository(StageEntity)
    private readonly stageEntityRepository: Repository<StageEntity>,
    private readonly utilQuery: TournamentRepository,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<BracketMatchGameEntity>,
    private readonly manager: BracketsManager,
    private readonly matchScheduleService: MatchScheduleService,
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
   * @param gameId - gameid of a match
   * @param winnerOpponentId - id of BracketParticipantEntity
   * @param d2cMatchId - id of dota2classic match if it happened
   * @param forfeit - tech lose
   */
  public async setGameWinner(
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
      externalMatchId: d2cMatchId,
      opponent1: game.opponent1,
      opponent2: game.opponent2,
    });

    const match = await this.bracketMatchEntityRepository.findOne({
      where: { id: Number(game.parent_id) },
      relations: ['games'],
    });

    await this.handleMatchUpdatedPerhaps(match, game.number);
  }

  private async handleMatchUpdatedPerhaps(
    m: BracketMatchEntity,
    finishedGameNumber: number,
  ) {
    this.logger.log('Match game finished! We need to reschedule everything');
    await this.ds.transaction(async (tx) => {
      await this.matchScheduleService.updateScheduleGameFinished(
        m,
        finishedGameNumber,
        tx,
      );
    });
  }

  private async getNextMatches(
    match: BracketMatchEntity,
  ): Promise<BracketMatchEntity[]> {
    const stage = await this.stageEntityRepository.findOneBy({
      id: match.stage_id,
    });

    // @ts-ignore
    const {
      roundNumber,
      roundCount,
      // @ts-ignore
    } = await this.manager.update.getRoundPositionalInfo(match.round_id);
    // @ts-ignore
    return await this.manager.update.getNextMatches(
      match,
      'single_bracket',
      stage,
      roundNumber,
      roundCount,
    );
  }
}
