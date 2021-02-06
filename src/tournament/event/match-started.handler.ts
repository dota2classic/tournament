import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchStartedEvent } from '../../gateway/events/match-started.event';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@EventsHandler(MatchStartedEvent)
export class MatchStartedHandler implements IEventHandler<MatchStartedEvent> {
  constructor(
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
  ) {}

  async handle(event: MatchStartedEvent) {
    if (event.info.tournamentId && event.info.tournamentMatchId) {
      // its a  tournament game yahoo!!
      const bm = await this.bracketMatchEntityRepository.findOne(
        event.info.tournamentMatchId,
      );
      if (bm) {
        bm.externalMatchId = event.matchId;
        await this.bracketMatchEntityRepository.save(bm);
      }
    } else return;
  }
}
