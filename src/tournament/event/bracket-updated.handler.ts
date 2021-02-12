import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BracketUpdatedEvent } from '../../rest/event/bracket-updated.event';
import { BracketService } from '../../rest/tournament/bracket.service';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StageEntity } from '../../db/entity/stage.entity';

@EventsHandler(BracketUpdatedEvent)
export class BracketUpdatedHandler
  implements IEventHandler<BracketUpdatedEvent> {
  constructor(
    private readonly bracketService: BracketService,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
  ) {}

  async handle(event: BracketUpdatedEvent) {
    const allMatches = await this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .leftJoin(StageEntity, 'stage', 'stage.id = bm.stage_id')
      .where('stage.tournament_id = :tId', { tId: event.tournamentId })
      .orderBy('bm.id', 'ASC')
      .getMany();


    console.log(`Bracket updated, need to process`, allMatches.map(t => t.id))
    // await Promise.all(
    //   allMatches.map(m => this.bracketService.checkMatchResults(m.id)),
    // );


    await this.bracketService.checkMatchResults(event.matchId)

    await this.bracketService.checkForTournamentFinish(event.tournamentId);
  }
}
