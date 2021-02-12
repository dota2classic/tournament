import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TournamentEntity } from '../../db/entity/tournament.entity';
import { BracketEntryType } from '../../gateway/shared-types/tournament';
import { CronJob } from 'cron';
import { RoundEntity } from '../../db/entity/round.entity';
import { EventBus } from '@nestjs/cqrs';
import { TournamentGameReadyEvent } from '../../gateway/events/tournament/tournament-game-ready.event';
import { BracketParticipantEntity } from '../../db/entity/bracket-participant.entity';
import { PlayerId } from '../../gateway/shared-types/player-id';
import { Status } from 'brackets-model';
import { UtilQuery } from '../../tournament/service/util-query';
import { MatchmakingMode } from '../../gateway/shared-types/matchmaking-mode';
import { StageEntity } from '../../db/entity/stage.entity';
import { MatchGameEntity } from '../../db/entity/match-game.entity';
import { isDev } from '../../config/env';

@Injectable()
export class BracketMatchService {
  private static keyForJob = (
    tournamentId: number,
    bracketMatchId: number,
    bracketMatchGameId: number,
  ) => `initMatch:${tournamentId}:${bracketMatchId}:${bracketMatchGameId}`;

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    @InjectRepository(RoundEntity)
    private readonly roundEntityRepository: Repository<RoundEntity>,
    private readonly ebus: EventBus,
    @InjectRepository(BracketParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      BracketParticipantEntity
    >,
    @InjectRepository(StageEntity)
    private readonly stageEntityRepository: Repository<StageEntity>,
    private readonly utilQuery: UtilQuery,
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
  ) {}

  private async clearJob(tid: number, bid: number, gid: number) {
    try {
      this.schedulerRegistry.deleteCronJob(
        BracketMatchService.keyForJob(tid, bid, gid),
      );
    } catch (e) {
      // if not match scheduled then ok.
    }
  }

  public async cancelMatchSchedule(tid: number, bid: number, gid: number) {
    return this.clearJob(tid, bid, gid);
  }

  public async scheduleBracketMatch(tid: number, bid: number) {
    const tour = await this.tournamentEntityRepository.findOne(tid);
    if (!tour) return;

    const bm = await this.bracketMatchEntityRepository.findOne(bid);
    if (!bm) return;

    // clear all old ones

    if (tour.entryType === BracketEntryType.PLAYER) {
      // its 1x1 strategy, 30 mins between rounds
      const tStartDate = tour.startDate;
      const round = await this.roundEntityRepository.findOne(bm.round_id);

      const games = await this.matchGameEntityRepository
        .find({
          bm_id: bid,
        })
        .then(t => t.sort((a, b) => a.number - b.number));

      // clear previous schedules if there are any
      await Promise.all(games.map(async g => this.clearJob(tid, bid, g.id)));

      // 20 min for a game in 1x1
      const minOffset = 20;
      for (let i = 0; i < games.length; i++) {
        const offset = 1000 * 60 * minOffset; // 30 min offset
        const g = games[i];

        g.scheduledDate = new Date(
          tStartDate.getTime() + offset * (round.number - 1) + 1000 * 60, // start 1 round with tournament start + minute
        );
        g.teamOffset = Math.round(Math.random());
        await this.matchGameEntityRepository.save(g);
        const job = new CronJob(g.scheduledDate, () =>
          this.initMatch(tid, bid, g.id),
        );
        this.schedulerRegistry.addCronJob(
          BracketMatchService.keyForJob(tid, bid, g.id),
          job,
        );
        job.start();
      }

      // if (!bm.scheduledDate) {
      //   const minOffset = 30;
      //   const offset = 1000 * 60 * minOffset; // 30 min offset
      //
      //   bm.scheduledDate = new Date(
      //     tStartDate.getTime() + offset * (roundNumber - 1) + 1000 * 60, // start 1 round with tournament start + minute
      //   );
      //   await this.bracketMatchEntityRepository.save(bm);
      // }
      //

      //
      // console.log(`Scheduled match ${bm.id} for ${bm.scheduledDate}`);
    } else {
      // its 5x5 strategy, 70 mins between rounds or so
    }
  }

  /**
   * Checks if we can start a match
   * If no, we re-schedule it 5 minutes later
   * If yes, we start match based on configuration
   * @param tid
   * @param bid
   * @param gid
   * @private
   */
  private async initMatch(tid: number, bid: number, gid: number) {
    const tour = await this.tournamentEntityRepository.findOne(tid);
    const b = await this.bracketMatchEntityRepository.findOne(bid);

    // offset generation right before initing stuff

    console.log('Yahoo!! init match ye');

    // no need to start matches if it's dev
    if (isDev) return;

    if (!b.opponent1?.id || !b.opponent2?.id) {
      console.error(`cant start match not enough opponents`);
      return;
    }

    const opp1 = await this.bracketParticipantEntityRepository.findOne(
      b.opponent1.id,
    );
    const opp2 = await this.bracketParticipantEntityRepository.findOne(
      b.opponent2.id,
    );

    if (tour.entryType === BracketEntryType.PLAYER) {
      let defaultOffset = [
        [new PlayerId(opp1.name)],
        [new PlayerId(opp2.name)],
      ];
      if (b.teamOffset === 1) {
        // if offset is present we change teams
        defaultOffset = [defaultOffset[1], defaultOffset[0]];
      }
      this.ebus.publish(
        new TournamentGameReadyEvent(
          tid,
          bid,
          tour.entryType === BracketEntryType.PLAYER
            ? MatchmakingMode.TOURNAMENT_SOLOMID
            : MatchmakingMode.TOURNAMENT,
          defaultOffset[0],
          defaultOffset[1],
          tour.entryType,
        ),
      );
    } else {
      throw 'Not implemented';
    }
    console.log('OK HERE WE NEED TO START MATCH SOMEHOW KEKEKEKEKEKE');
  }

  async scheduleMatches() {
    const pendingMatches = await this.bracketMatchEntityRepository.find({
      status: Status.Ready,
    });

    for (const match of pendingMatches) {
      const t = await this.utilQuery.matchTournamentId(match.id);

      await this.scheduleBracketMatch(t, match.id);
    }
  }

  /**
   * This thing generates MatchGameEntities for a give match id
   * @param tid - tournament id
   * @param bid - bracket match ID
   */
  public async generateGames(tid: number, bid: number) {
    const tour = await this.tournamentEntityRepository.findOne(tid);
    if (!tour) return;

    const bm = await this.bracketMatchEntityRepository.findOne(bid);
    if (!bm) return;

    const stage = await this.stageEntityRepository.findOne({
      id: bm.stage_id,
    });


    // BYE case
    if(bm.opponent1 === null || bm.opponent2 === null){
      return;
    }

    const round = await this.roundEntityRepository.findOne(bm.round_id);
    const totalRounds = await this.roundEntityRepository.find({
      group_id: bm.group_id,
    });

    const maxRounds = totalRounds.sort((a, b) => b.number - a.number)[0].number;

    if(maxRounds === 1){
      // it's grand final im SURE

      for (let i = 1; i <= tour.bestOfConfig.grandFinal; i++) {
        const mg = new MatchGameEntity();
        mg.bm_id = bm.id;
        mg.number = i;
        await this.matchGameEntityRepository.save(mg);
      }
    }else if (round.number === maxRounds) {
      // it is casual finals
      for (let i = 1; i <= tour.bestOfConfig.final; i++) {
        const mg = new MatchGameEntity();
        mg.bm_id = bm.id;
        mg.number = i;
        await this.matchGameEntityRepository.save(mg);
      }
    } else {
      // not finals - bo1

      for (let i = 1; i <= tour.bestOfConfig.round; i++) {
        const mg = new MatchGameEntity();
        mg.bm_id = bm.id;
        mg.number = i;
        await this.matchGameEntityRepository.save(mg);
      }
    }
  }
}
