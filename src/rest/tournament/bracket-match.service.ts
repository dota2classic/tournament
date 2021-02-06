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
import { MatchmakingMode } from '../../gateway/shared-types/matchmaking-mode';
import { BracketParticipantEntity } from '../../db/entity/bracket-participant.entity';
import { PlayerId } from '../../gateway/shared-types/player-id';

@Injectable()
export class BracketMatchService {
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
  ) {}

  public async scheduleBracketMatch(tid: number, bid: number) {
    const tour = await this.tournamentEntityRepository.findOne(tid);
    if (!tour) return;

    const bm = await this.bracketMatchEntityRepository.findOne(bid);
    if (!bm) return;

    if (tour.entryType === BracketEntryType.PLAYER) {
      // its 1x1 strategy, 30 mins between rounds
      const tStartDate = tour.startDate;
      const round = await this.roundEntityRepository.findOne(bm.round_id);
      const roundNumber = round.number;

      const minOffset = 0.1;
      const offset = 1000 * 60 * minOffset; // 30 min offset

      const matchDate = new Date(tStartDate.getTime() + offset * roundNumber);
      const job = new CronJob(matchDate, () => this.initMatch(tid, bid));
      this.schedulerRegistry.addCronJob(`initMatch:${tour.id}:${bm.id}`, job);
      job.start();

      console.log(`Scheduled match ${bm.id} for ${matchDate}`);
    } else {
      // its 5x5 strategy, 70 mins between rounds or so
    }
  }

  private async initMatch(tid: number, bid: number) {
    const tour = await this.tournamentEntityRepository.findOne(tid);
    const b = await this.bracketMatchEntityRepository.findOne(bid);


    // offset generation right before initing stuff
    b.teamOffset = Math.round(Math.random());
    await this.bracketMatchEntityRepository.save(b);

    console.log('Yahoo!! init match ye');

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
      if(b.teamOffset === 1){
        // if offset is present we change teams
        defaultOffset = [
          defaultOffset[1],
          defaultOffset[0]
        ]
      }
      this.ebus.publish(
        new TournamentGameReadyEvent(
          tid,
          bid,
          MatchmakingMode.TOURNAMENT,
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
}
