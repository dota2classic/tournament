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
import { GroupEntity } from '../../db/entity/group.entity';

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
    @InjectRepository(GroupEntity)
    private readonly groupEntityRepository: Repository<GroupEntity>,
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

      const games = await this.matchGameEntityRepository
        .find({
          bm_id: bid,
        })
        .then(t => t.sort((a, b) => a.number - b.number));

      // clear previous schedules if there are any
      await Promise.all(games.map(async g => this.clearJob(tid, bid, g.id)));

      // 20 min for a game in 1x1
      for (let i = 0; i < games.length; i++) {
        const g = games[i];
        g.teamOffset = Math.round(Math.random());
        await this.matchGameEntityRepository.save(g);
        await this.setupCron(tid, bid, g.id, g.scheduledDate);
      }
    } else {
      // its 5x5 strategy, 70 mins between rounds or so
    }
  }


  public async scheduleBracketMatchGame(tid: number, bid: number, gameId: number, newDate: number) {
    const tour = await this.tournamentEntityRepository.findOne(tid);
    if (!tour) return;

    // clear all old ones

    const game = await this.matchGameEntityRepository.findOne(gameId);

    // clear previous schedule if there is
    await this.clearJob(tid, game.bm_id, gameId);

    game.scheduledDate = new Date(newDate);
    await this.matchGameEntityRepository.save(game);
    await this.setupCron(tid, bid, gameId, game.scheduledDate);

  }


  private async setupCron(
    tid: number,
    bid: number,
    gid: number,
    scheduledDate: Date,
  ) {
    await this.clearJob(tid, bid, gid);
    const job = new CronJob(scheduledDate, () => this.initMatch(tid, bid, gid));
    this.schedulerRegistry.addCronJob(
      BracketMatchService.keyForJob(tid, bid, gid),
      job,
    );
    job.start();
    console.log(`Scheduled Game #${gid} of match #${bid} for ${scheduledDate}`);
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
    const game = await this.matchGameEntityRepository.findOne(gid);


    if(game.finished){
      // not needed 4 some reason
      console.log(`InitMatch not needed: game is finished.`)
      return;
    }
    // offset generation right before initing stuff

    console.log(`Time has come, start game ${gid}`);

    // no need to start matches if it's dev
    if (isDev) return;

    if (!b.opponent1?.id || !b.opponent2?.id) {
      console.error(`cant start match not enough opponents`);
      // here we need to re-schedule
      game.scheduledDate = new Date(
        game.scheduledDate.getTime() + 1000 * 60 * 5,
      );
      await this.matchGameEntityRepository.save(game);
      await this.setupCron(tid, bid, gid, game.scheduledDate); // re-schedule 5 mins later
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
      if (game.teamOffset === 1) {
        // if offset is present we change teams
        defaultOffset = [defaultOffset[1], defaultOffset[0]];
      }
      this.ebus.publish(
        new TournamentGameReadyEvent(
          tid, // tournament id
          gid, // game id
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

    const group = await this.groupEntityRepository.findOne({
      id: bm.group_id,
    });

    // BYE case
    if (bm.opponent1 === null || bm.opponent2 === null) {
      return;
    }

    const round = await this.roundEntityRepository.findOne(bm.round_id);
    const totalRounds = await this.roundEntityRepository.find({
      group_id: bm.group_id,
    });

    let roundOffset: number = 0;
    if (group.number === 1) {
      // WB bracket/standart bracket
      roundOffset = 0;
    } else if (group.number === 2) {
      // LB
      // we need to add 1, because lower bracket only starts after first round of WB
      roundOffset = 1;
    } else if (group.number === 3) {
      // GrandFinal
      // we need to find LB and count rounds + offset
      const roundsInLB = await this.roundEntityRepository
        .createQueryBuilder('r')
        .innerJoin(
          GroupEntity,
          'group',
          'group.stage_id = r.stage_id and group.number = 2',
        )
        .getCount();

      roundOffset = 1 + roundsInLB;
    }

    const roundNumber = round.number;

    const maxRounds = totalRounds.sort((a, b) => b.number - a.number)[0].number;

    const calcOffset = (i: number): number => {
      // in minutes
      const perGame = tour.entryType === BracketEntryType.PLAYER ? 15 : 60;

      return (roundOffset + roundNumber + i) * perGame * 1000 * 60; // mins => millis
    };

    let bestOf: number;
    if (group.number === 3) {
      bestOf = tour.bestOfConfig.grandFinal;
    } else if (round.number === maxRounds) {
      bestOf = tour.bestOfConfig.final;
    } else {
      bestOf = tour.bestOfConfig.round;
    }

    for (let i = 1; i <= bestOf; i++) {
      const mg = new MatchGameEntity();
      mg.bm_id = bm.id;
      mg.number = i;
      mg.scheduledDate = new Date(new Date().getTime() + calcOffset(i));
      await this.matchGameEntityRepository.save(mg);
    }
  }
}
