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
import { DataSource, EntityManager, Repository } from 'typeorm';
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
import { addSeconds, isBefore } from 'date-fns';
import { BracketsManager } from 'brackets-manager';

@Injectable()
export class MatchScheduleService {
  private readonly logger = new Logger(MatchScheduleService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly ebus: EventBus,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(StageEntity)
    private readonly stageEntityRepository: Repository<StageEntity>,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<
      BracketMatchGameEntity
    >,
    private readonly manager: BracketsManager,
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
        this.logger.log('Checking games for schedule using lock');
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

    const readyMatches = await this.bracketMatchEntityRepository
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
      .andWhere('bm.status = :status', {
        status: Status.Ready,
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
    await this.ds.transaction(async tx => {
      await Promise.all(
        readyMatches.map(match =>
          this.tryRescheduleMatch(match, tournamentStartDate, tx),
        ),
      );
      this.logger.log(`Scheduled ${readyMatches.length} initial matches`);
    });
  }

  public async tryRescheduleMatch(
    match: BracketMatchEntity,
    newMatchStart: Date,
    tx: EntityManager = this.bracketMatchEntityRepository.manager,
  ) {
    return this.tryRescheduleMatchGame(match, 1, newMatchStart, tx);
  }

  public async updateScheduleGameFinished(
    match: BracketMatchEntity,
    gameNumber: number,
    tx: EntityManager = this.bracketMatchEntityRepository.manager,
  ) {
    // Game is finished! we need to update next games in match if needed, and also update parent matches
    if (!match.games) {
      match.games = await this.matchGameEntityRepository.findBy({
        parent_id: match.id,
      });
    }

    const tournament = await this.getTournament(match);
    const nextGameStart = addSeconds(
      new Date(),
      tournament.scheduleStrategy.gameBreakDurationSeconds,
    );

    if (match.games.length === gameNumber) {
      // Match is completely finished: we only need to update parent matches
      this.logger.log(
        'Match games fully finished: only updating parent matches',
      );
      await this.updateParentMatches(match, nextGameStart, tx);
    } else {
      // Match is not completely finished: need to update next games first
      this.logger.log(
        'Match games are not fully finished: updating next games',
      );
      await this.tryRescheduleMatchGame(
        match,
        gameNumber + 1,
        nextGameStart,
        tx,
      );
    }
  }

  public async tryRescheduleMatchGame(
    match: BracketMatchEntity,
    gameNumber: number,
    startTime: Date,
    tx: EntityManager = this.bracketMatchEntityRepository.manager,
  ) {
    const game = await tx.findOne<BracketMatchGameEntity>(
      BracketMatchGameEntity,
      {
        where: {
          parent_id: match.id,
          number: gameNumber,
        },
      },
    );
    this.logger.log(
      `Trying to schedule match game ${match.id}, game_number=${gameNumber}, current=${game.scheduledDate}, want=${startTime}`,
    );

    if (game.scheduledDate && isBefore(startTime, game.scheduledDate)) {
      // No need to recalculate match start: we do not move start date back in time
      this.logger.warn('Tried to schedule game to earlier time');
      return;
    }

    if (!match.games) {
      match.games = await this.matchGameEntityRepository.findBy({
        parent_id: match.id,
      });
    }
    match.games.sort((a, b) => a.number - b.number);

    await this.scheduleSubsequentGames(match, gameNumber, startTime, tx);
  }

  private async scheduleSubsequentGames(
    match: BracketMatchEntity,
    startFromGameNumber: number,
    startTime: Date,
    tx: EntityManager = this.bracketMatchEntityRepository.manager,
  ) {
    const tournament = await this.getTournament(match);

    // Calculate start times of match and games
    if (startFromGameNumber === 1) {
      match.scheduledDate = startTime;
    }
    const gameWithBreakSeconds =
      tournament.scheduleStrategy.gameDurationSeconds +
      tournament.scheduleStrategy.gameBreakDurationSeconds;

    for (let i = startFromGameNumber - 1; i < match.games.length; i++) {
      match.games[i].scheduledDate = addSeconds(
        startTime,
        i * gameWithBreakSeconds,
      );
    }

    const matchEndTime = addSeconds(
      startTime,
      (match.games.length - startFromGameNumber + 1) * gameWithBreakSeconds,
    );
    await tx.save(BracketMatchEntity, match);
    await tx.save(BracketMatchGameEntity, match.games);

    this.logger.log(
      `Updated schedule for match ${match.id}. New start time: ${match.scheduledDate}, end time: ${matchEndTime}`,
    );

    // Update parents
    await this.updateParentMatches(match, matchEndTime, tx);
  }

  private async updateParentMatches(
    match: BracketMatchEntity,
    startTime: Date,
    tx: EntityManager,
  ) {
    // Update parents
    const parentMatches = await this.getParentMatches(match);
    await Promise.all(
      parentMatches.map(match => this.tryRescheduleMatch(match, startTime, tx)),
    );
  }

  private async getParentMatches(
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

  private getTournament(match: BracketMatchEntity) {
    return this.tournamentRepository
      .createQueryBuilder('t')
      .innerJoin('t.stages', 'stg')
      .where('stg.id = :stage_id', { stage_id: match.stage_id })
      .getOne();
  }
}
