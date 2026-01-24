import { Injectable, Logger } from '@nestjs/common';
import { StageEntity } from '../db/entity/stage.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { TournamentStatus } from '../gateway/shared-types/tournament';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { RoundEntity } from '../db/entity/round.entity';

export const ROUND_OFFSET_SECONDS = 60 * 60; // 1 hour between games.
@Injectable()
export class BracketMatchScheduleService {
  private readonly logger = new Logger(BracketMatchScheduleService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
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
  ) {}

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
        match.games[i].scheduledDate = new Date(matchStart.getTime() + i * perGameOffset);
      }
    }

    await this.bracketMatchEntityRepository.save(pendingMatches);
    await this.gameRepository.save(pendingMatches.flatMap(t => t.games));

    this.logger.log(`Scheduled ${pendingMatches.length} matches`);
  }
}
