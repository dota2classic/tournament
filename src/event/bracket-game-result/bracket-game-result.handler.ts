import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BracketGameResultEvent } from './bracket-game-result.event';
import { BracketMatchGameEntity } from '../../db/entity/bracket-match-game.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketsManager } from 'brackets-manager';
import { BracketMatchEntity } from 'db/entity/bracket-match.entity';
import { BracketUpdatedEvent } from 'event/bracket-updated.event';
import { TournamentRepository } from '../../repository/tournament.repository';

@EventsHandler(BracketGameResultEvent)
export class BracketGameResultHandler
  implements IEventHandler<BracketGameResultEvent> {
  constructor(
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<BracketMatchGameEntity>,
    private readonly manager: BracketsManager,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    private readonly ebus: EventBus,
    private readonly utilQuery: TournamentRepository,
  ) {}

  async handle(event: BracketGameResultEvent) {
    const game = await this.matchGameEntityRepository.findOneById(event.gameId);
    const match = await this.bracketMatchEntityRepository.findOneById(
      game.parent_id,
    );

    const winSide = event.winner;
    const loseSide = event.winner === 'opponent1' ? 'opponent2' : 'opponent1';

    await this.manager.update.match<BracketMatchEntity>({
      id: game.parent_id,
      [winSide]: {
        score: (match[winSide]?.score || 0) + 1,
        position: match[winSide]?.position,
      },
      [loseSide]: {
        score: match[loseSide]?.score || 0,
        position: match[loseSide]?.position,
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
