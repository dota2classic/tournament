import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchStartedEvent } from '../../gateway/events/match-started.event';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchGameEntity } from '../../db/entity/match-game.entity';

@EventsHandler(MatchStartedEvent)
export class MatchStartedHandler implements IEventHandler<MatchStartedEvent> {
  constructor(
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
  ) {}

  async handle(event: MatchStartedEvent) {
    if (event.info.tournamentId && event.info.tournamentMatchId) {
      // its a  tournament game yahoo!!
      const game = await this.matchGameEntityRepository.findOne({
        id: event.info.tournamentMatchId,
      });
      // attach match
      if (game) {
        game.externalMatchId = event.matchId;
        await this.bracketMatchEntityRepository.save(game);
      }
    } else return;
  }
}
