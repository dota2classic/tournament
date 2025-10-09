import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BracketUpdatedEvent } from './bracket-updated.event';
import { Bracket2Service } from '../service/bracket2.service';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BracketMatchService } from '../service/bracket-match.service';

@EventsHandler(BracketUpdatedEvent)
export class BracketUpdatedHandler
  implements IEventHandler<BracketUpdatedEvent> {
  constructor(
    private readonly bracketService: Bracket2Service,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    private readonly bracketMatchService: BracketMatchService,
  ) {}

  async handle(event: BracketUpdatedEvent) {
    await this.bracketService.checkMatchResults(event.matchId);

    // clear schedules
    await this.bracketMatchService.cancelMatchSchedule(
      event.tournamentId,
      event.matchId,
      event.gameId,
    );

    await this.bracketService.checkForTournamentFinish(event.tournamentId);
  }
}
