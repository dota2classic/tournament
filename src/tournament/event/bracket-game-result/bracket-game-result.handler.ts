import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BracketGameResultEvent } from './bracket-game-result.event';
import { MatchGameEntity } from '../../../db/entity/match-game.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketsManager } from 'brackets-manager';
import { BracketMatchEntity } from '../../../db/entity/bracket-match.entity';
import { BracketUpdatedEvent } from '../../../rest/event/bracket-updated.event';
import { UtilQuery } from '../../service/util-query';

@EventsHandler(BracketGameResultEvent)
export class BracketGameResultHandler
  implements IEventHandler<BracketGameResultEvent> {
  constructor(
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
    private readonly manager: BracketsManager,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    private readonly ebus: EventBus,
    private readonly utilQuery: UtilQuery,
  ) {}

  async handle(event: BracketGameResultEvent) {
    const game = await this.matchGameEntityRepository.findOne(event.gameId);
    const match = await this.bracketMatchEntityRepository.findOne(game.bm_id);

    const winSide = event.winner;

    await this.manager.update.match({
      id: game.bm_id,
      [winSide]: {
        score: (match[winSide]?.score || 0) + 1,
      },
    });

    this.ebus.publish(
      new BracketUpdatedEvent(
        await this.utilQuery.matchTournamentId(match.id),
        match.id,
        game.id,
      ),
    );
  }
}
