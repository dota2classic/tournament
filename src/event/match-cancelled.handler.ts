import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchCancelledEvent } from '../gateway/events/match-cancelled.event';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';

@EventsHandler(MatchCancelledEvent)
export class MatchCancelledHandler
  implements IEventHandler<MatchCancelledEvent> {
  private logger = new Logger(MatchCancelledHandler.name)
  constructor(
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<BracketMatchGameEntity>,
  ) {}

  async handle(event: MatchCancelledEvent) {
    this.logger.error("MatchCancelledEvent: unexpected", event)
    // if (event.info.tournamentId && event.info.tournamentMatchId) {
    //   const game = await this.matchGameEntityRepository.findOneBy({
    //     id: event.info.tournamentMatchId,
    //   });
    //
    //   if (!game) return;
    //
    //   game.externalMatchId = undefined;
    //   await this.matchGameEntityRepository.save(game);
    // }
  }
}
