import { Injectable, Logger } from '@nestjs/common';
import { StageEntity } from '../db/entity/stage.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { TournamentStatus } from '../gateway/shared-types/tournament';
import { Status } from 'brackets-model';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { GameScheduleService } from './game-schedule.service';
import { TournamentRepository } from '../repository/tournament.repository';

@Injectable()
export class BracketMatchScheduleService {

  private static DEFAULT_OFFSET_FOR_SOLOMID = 0.1;
  private static DEFAULT_OFFSET_FOR_CAPTAINS_MODE = 80;

  private readonly logger = new Logger(BracketMatchScheduleService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<BracketMatchGameEntity>,
    private readonly scheduler: GameScheduleService,
    private readonly tournamentRepository: TournamentRepository
  ) {
  }

  private static keyForJob = (
    tournamentId: number,
    bracketMatchId: number,
    bracketMatchGameId: number,
  ) => `initMatch:${tournamentId}:${bracketMatchId}:${bracketMatchGameId}`;

  private async clearJob(tid: number, bid: number, gid: number) {
    try {
      this.schedulerRegistry.deleteCronJob(
        BracketMatchScheduleService.keyForJob(tid, bid, gid),
      );
    } catch (e) {
      // if not match scheduled then ok.
    }
  }

  public async cancelMatchSchedule(tid: number, bid: number, gid: number) {
    return this.clearJob(tid, bid, gid);
  }

  public async scheduleBracketMatch(tournamentId: number, matchId: number) {
    const games = await this.matchGameEntityRepository
      .findBy({
        parent_id: matchId,
      })
      .then(t => t.sort((a, b) => a.number - b.number));

    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      g.teamOffset = Math.round(Math.random());
      await this.matchGameEntityRepository.save(g);

      await this.scheduler.scheduleGame(
        tournamentId,
        matchId,
        g.id,
        g.scheduledDate.getTime(),
      );
    }
  }

  public async scheduleMatches() {
    const pendingMatches = await this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .innerJoin(StageEntity, 'stage', 'bm.stage_id = stage.id')
      .innerJoin(
        TournamentEntity,
        'tournament',
        'tournament.id = stage.tournament_id',
      )
      .where('tournament.status = :status', {
        status: TournamentStatus.IN_PROGRESS,
      })
      .andWhere('bm.status not in (:...statuses)', {
        statuses: [Status.Completed, Status.Archived],
      })
      .getMany();

    // todo promise.all

    for (const match of pendingMatches) {
      const t = await this.tournamentRepository.matchTournamentId(match.id);

      await this.scheduleBracketMatch(t, match.id);
    }

    this.logger.log(`Scheduled ${pendingMatches.length} matches`);
  }

}
