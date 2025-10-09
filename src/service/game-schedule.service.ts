import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronJob } from 'cron';
import { EventBus } from '@nestjs/cqrs';
import { BracketGameTimerReadyEvent } from '../event/bracket-game-timer-ready/bracket-game-timer-ready.event';

@Injectable()
export class GameScheduleService {
  private readonly logger = new Logger(GameScheduleService.name);

  private static keyForJob = (
    tournamentId: number,
    bracketMatchId: number,
    bracketMatchGameId: number,
  ) => `initMatch:${tournamentId}:${bracketMatchId}:${bracketMatchGameId}`;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<BracketMatchGameEntity>,
    private readonly ebus: EventBus,
  ) {}

  private async clearJob(tid: number, bid: number, gid: number) {
    try {
      this.schedulerRegistry.deleteCronJob(
        GameScheduleService.keyForJob(tid, bid, gid),
      );
    } catch (e) {
      // if not match scheduled then ok.
    }
  }

  public async deSchedule(
    tournamentId: number,
    matchId: number,
    gameId: number,
  ) {
    return this.clearJob(tournamentId, matchId, gameId);
  }

  public async scheduleGame(
    tournamentId: number,
    matchId: number,
    gameId: number,
    newDate: number,
  ) {
    const game = await this.matchGameEntityRepository.findOneBy({ id: gameId });
    // clear previous schedule if there is
    await this.clearJob(tournamentId, game.bm_id, gameId);

    // update schedule date
    game.scheduledDate = new Date(newDate);
    await this.matchGameEntityRepository.save(game);

    await this.setupCron(tournamentId, matchId, gameId, game.scheduledDate);
  }

  private async setupCron(
    tournamentId: number,
    matchId: number,
    gameId: number,
    scheduledDate: Date,
  ) {
    await this.clearJob(tournamentId, matchId, gameId);
    try {
      const job = new CronJob(scheduledDate, () =>
        this.ebus.publish(
          new BracketGameTimerReadyEvent(tournamentId, matchId, gameId),
        ),
      );
      this.schedulerRegistry.addCronJob(
        GameScheduleService.keyForJob(tournamentId, matchId, gameId),
        job,
      );
      job.start();
      this.logger.log(
        `Scheduled game ${gameId} of match ${matchId} for ${scheduledDate}`,
      );
    } catch (e) {
      this.logger.warn(
        `Couldn't schedule game ${gameId} of match ${matchId} for ${scheduledDate}`,
        e,
      );
    }
  }
}
