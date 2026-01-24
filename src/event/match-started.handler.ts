import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchStartedEvent } from '../gateway/events/match-started.event';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { Logger } from '@nestjs/common';

@EventsHandler(MatchStartedEvent)
export class MatchStartedHandler implements IEventHandler<MatchStartedEvent> {
  private logger = new Logger(MatchStartedHandler.name);
  constructor(
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<
      BracketMatchGameEntity
    >,
  ) {}

  async handle(event: MatchStartedEvent) {
    const game = await this.matchGameEntityRepository.findOne({
      where: {
        id: event.info.roomId,
      },
    });
    if (!game) return;

    this.logger.log('Match started for a tournament game!');
    await this.matchGameEntityRepository.update(
      {
        id: event.info.roomId,
      },
      {
        externalMatchId: event.matchId,
      },
    );
  }
}
