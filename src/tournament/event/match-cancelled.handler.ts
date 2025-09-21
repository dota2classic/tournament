import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchCancelledEvent } from '../../gateway/events/match-cancelled.event';
import { MatchGameEntity } from '../../db/entity/match-game.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(MatchCancelledEvent)
export class MatchCancelledHandler
  implements IEventHandler<MatchCancelledEvent> {
  constructor(
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
  ) {}

  async handle(event: MatchCancelledEvent) {
    if (event.info.tournamentId && event.info.tournamentMatchId) {
      const game = await this.matchGameEntityRepository.findOneBy({
        id: event.info.tournamentMatchId,
      });

      if (!game) return;

      game.externalMatchId = undefined;
      await this.matchGameEntityRepository.save(game);
    }
  }
}
