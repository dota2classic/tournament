import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TournamentEntity } from '../../db/entity/tournament.entity';
import { BracketEntryType } from '../../gateway/shared-types/tournament';
import { CronJob } from 'cron';
import { RoundEntity } from '../../db/entity/round.entity';

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

  ) {}

  public async scheduleBracketMatch(tid: number, bid: number) {
    const tour = await this.tournamentEntityRepository.findOne(tid);
    if (!tour) return;

    const bm = await this.bracketMatchEntityRepository.findOne(bid);
    if (!bm) return;


    if(tour.entryType === BracketEntryType.PLAYER){
      // its 1x1 strategy, 30 mins between rounds
      const tStartDate = tour.startDate;
      const round = await this.roundEntityRepository.findOne(bm.round_id);
      const roundNumber = round.number;


      const minOffset = 0.1;
      const offset = 1000 * 60 * minOffset // 30 min offset

      const matchDate = new Date(tStartDate.getTime() + offset * roundNumber);
      this.schedulerRegistry.addCronJob(`initMatch:${tour.id}:${bm.id}`, new CronJob(matchDate, () => this.initMatch(tid, bid)))
      console.log(`Scheduled match ${bm.id} for ${matchDate}`)
    }else{
      // its 5x5 strategy, 70 mins between rounds or so
    }
  }

  private initMatch(tid: number, bid: number) {
    console.log('OK HERE WE NEED TO START MATCH SOMEHOW KEKEKEKEKEKE')
  }
}
