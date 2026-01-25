import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StageEntity } from '../db/entity/stage.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { TournamentStatus } from '../gateway/shared-types/tournament';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { RoundEntity } from '../db/entity/round.entity';
import { Status } from 'brackets-model';
import { MatchPlayer } from '../gateway/events/room-ready.event';
import { DotaTeam } from '../gateway/shared-types/dota-team';
import { PlayerId } from '../gateway/shared-types/player-id';
import { LobbyReadyEvent } from '../gateway/events/lobby-ready.event';
import { MatchmakingMode } from '../gateway/shared-types/matchmaking-mode';
import { Dota_Map } from '../gateway/shared-types/dota-map';
import { Dota_GameMode } from '../gateway/shared-types/dota-game-mode';
import { Dota2Version } from '../gateway/shared-types/dota2version';
import { DotaPatch } from '../gateway/constants/patch';
import { Region } from '../gateway/shared-types/region';
import { EventBus } from '@nestjs/cqrs';
import { ParticipantEntity } from '../db/entity/participant.entity';
import { RedlockService } from '@dota2classic/redlock/dist/redlock.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export const ROUND_OFFSET_SECONDS = 60 * 60; // 1 hour between games.
@Injectable()
export class MatchScheduleService {
  private readonly logger = new Logger(MatchScheduleService.name);

  constructor(
    private readonly ebus: EventBus,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<
      BracketMatchGameEntity
    >,
    @InjectRepository(TournamentEntity)
    private readonly tournamentRepository: Repository<TournamentEntity>,
    @InjectRepository(RoundEntity)
    private readonly roundEntityRepository: Repository<RoundEntity>,
    @InjectRepository(BracketMatchGameEntity)
    private readonly gameRepository: Repository<BracketMatchGameEntity>,
    @InjectRepository(ParticipantEntity)
    private readonly participantEntityRepository: Repository<ParticipantEntity>,
    private readonly redlock: RedlockService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  public async runScheduledMatches() {
    await this.redlock.withLock(
      ['tournament-schedule-matches'],
      30_000,
      async signal => {
        const gamesToSchedule = await this.gameRepository
          .createQueryBuilder('gm')
          .where('gm.gameserver_scheduled = false')
          .andWhere('gm.status = :status', { status: Status.Ready })
          .andWhere('gm.scheduled_date <= now()')
          .getMany();

        if (gamesToSchedule.length === 0) return;

        for (let bracketMatchGameEntity of gamesToSchedule) {
          if (signal.aborted) {
            throw signal.error;
          }
          await this.submitGameToLaunch(bracketMatchGameEntity.id);
        }

        this.logger.log(
          `Submitted ${gamesToSchedule.length} games. Releasing lock`,
        );
      },
    );
  }

  public async scheduleMatches(tid: number) {
    const tournament = await this.tournamentRepository.findOneBy({ id: tid });
    const pendingMatches = await this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .innerJoin(StageEntity, 'stage', 'bm.stage_id = stage.id')
      .innerJoinAndSelect('bm.round', 'round')
      .innerJoinAndSelect('bm.games', 'games')
      .innerJoin(
        TournamentEntity,
        'tournament',
        'tournament.id = stage.tournament_id',
      )
      .where('tournament.state = :state', {
        state: TournamentStatus.IN_PROGRESS,
      })
      .andWhere('tournament.id = :tid', {
        tid,
      })
      .getMany();

    /**
     * Rules:
     * 1) First round matches start when tournament starts.
     * 2) Dependent matches start at max(previous_match1.end, previous_match2.end) + 15 minutes
     *
     *
     * What to consider:
     * lower group has offset of1 match. We ignore lower group for now and only think of single elimination.
     */

    const tournamentStartDate = tournament.startDate;

    // Sort by round order
    pendingMatches.sort(t => t.round.number);

    const bestOf = tournament.bestOfConfig;

    this.logger.log('Tournament start date is: ', tournament.startDate);

    const perGameOffset = ROUND_OFFSET_SECONDS * 1000;

    for (const match of pendingMatches) {
      const roundOffset =
        (match.round.number - 1) * perGameOffset * bestOf.round;
      const matchStart = new Date(tournamentStartDate.getTime() + roundOffset);

      match.scheduledDate = matchStart;
      match.games.sort((a, b) => a.number - b.number);
      for (let i = 0; i < match.games.length; i++) {
        match.games[i].scheduledDate = new Date(
          matchStart.getTime() + i * perGameOffset,
        );
      }
    }

    await this.bracketMatchEntityRepository.save(pendingMatches);
    await this.gameRepository.save(pendingMatches.flatMap(t => t.games));

    this.logger.log(`Scheduled ${pendingMatches.length} matches`);
  }

  private async submitGameToLaunch(gameId: string) {
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
        this.participantEntityRepository.findOne({
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

    participants.forEach((part, idx) => {
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

    // Mark as scheduled
    await this.gameRepository.update(
      {
        id: gameId,
      },
      {
        gameserverScheduled: true,
      },
    );
  }
}
