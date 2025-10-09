import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { TournamentStatus } from '../gateway/shared-types/tournament';
import { RoundEntity } from '../db/entity/round.entity';
import { EventBus } from '@nestjs/cqrs';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { Status } from 'brackets-model';
import { UtilQuery } from './util-query';
import { StageEntity } from '../db/entity/stage.entity';
import { MatchGameEntity } from '../db/entity/match-game.entity';
import { GroupEntity } from '../db/entity/group.entity';
import { GameScheduleService } from './game-schedule.service';

@Injectable()
export class BracketMatchService {
  private readonly logger = new Logger(BracketMatchService.name);

  private static keyForJob = (
    tournamentId: number,
    bracketMatchId: number,
    bracketMatchGameId: number,
  ) => `initMatch:${tournamentId}:${bracketMatchId}:${bracketMatchGameId}`;

  private static DEFAULT_OFFSET_FOR_SOLOMID = 0.1;
  private static DEFAULT_OFFSET_FOR_CAPTAINS_MODE = 80;

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
    @InjectRepository(TournamentParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      TournamentParticipantEntity
    >,
    @InjectRepository(GroupEntity)
    private readonly groupEntityRepository: Repository<GroupEntity>,
    @InjectRepository(StageEntity)
    private readonly stageEntityRepository: Repository<StageEntity>,
    private readonly utilQuery: UtilQuery,
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
    private readonly scheduler: GameScheduleService,
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

  public async scheduleBracketMatch(tournamentId: number, matchId: number) {
    const games = await this.matchGameEntityRepository
      .findBy({
        bm_id: matchId,
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

  async scheduleMatches() {
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
      const t = await this.utilQuery.matchTournamentId(match.id);

      await this.scheduleBracketMatch(t, match.id);
    }

    this.logger.log(`Scheduled ${pendingMatches.length} matches`);
  }

  /**
   * This thing generates MatchGameEntities for a give match id
   * @param tid - tournament id
   * @param bid - bracket match ID
   */
  public async generateGames(tid: number, bid: number) {
    throw 'TODO IMPLEMENT';
    // const tour = await this.tournamentEntityRepository.findOneById(tid);
    // if (!tour) return;
    //
    // const bm = await this.bracketMatchEntityRepository.findOneById(bid);
    // if (!bm) return;
    //
    // const group = await this.groupEntityRepository.findOneBy({
    //   id: bm.group_id,
    // });
    //
    // // BYE case
    // if (bm.opponent1 === null || bm.opponent2 === null) {
    //   return;
    // }
    //
    // const round = await this.roundEntityRepository.findOneById(bm.round_id);
    // const totalRounds = await this.roundEntityRepository.findBy({
    //   group_id: bm.group_id,
    // });
    //
    // let roundOffset = 0;
    // if (group.number === 1) {
    //   // WB bracket/standart bracket
    //   roundOffset = 0;
    // } else if (group.number === 2) {
    //   // LB
    //   // we need to add 1, because lower bracket only starts after first round of WB
    //   roundOffset = 1;
    // } else if (group.number === 3) {
    //   // GrandFinal
    //   // we need to find LB and count rounds + offset
    //   const roundsInLB = await this.roundEntityRepository
    //     .createQueryBuilder('r')
    //     .innerJoin(
    //       GroupEntity,
    //       'group',
    //       'group.stage_id = r.stage_id and group.number = 2',
    //     )
    //     .getCount();
    //
    //   roundOffset = 1 + roundsInLB;
    // }
    //
    // const roundNumber = round.number;
    //
    // const maxRounds = totalRounds.sort((a, b) => b.number - a.number)[0].number;
    //
    // const calcOffset = (i: number): number => {
    //   // in minutes
    //   const perGame =
    //     tour.entryType === BracketEntryType.PLAYER
    //       ? BracketMatchService.DEFAULT_OFFSET_FOR_SOLOMID
    //       : BracketMatchService.DEFAULT_OFFSET_FOR_CAPTAINS_MODE;
    //
    //   return (roundOffset + roundNumber + i) * perGame * 1000 * 60; // mins => millis
    // };
    //
    // let bestOf: number;
    // if (group.number === 3) {
    //   bestOf = tour.bestOfConfig.grandFinal;
    // } else if (round.number === maxRounds) {
    //   bestOf = tour.bestOfConfig.final;
    // } else {
    //   bestOf = tour.bestOfConfig.round;
    // }
    //
    // for (let i = 1; i <= bestOf; i++) {
    //   const mg = new MatchGameEntity();
    //   mg.bm_id = bm.id;
    //   mg.number = i;
    //   mg.scheduledDate = new Date(new Date().getTime() + calcOffset(i));
    //   await this.matchGameEntityRepository.save(mg);
    // }
  }
}
