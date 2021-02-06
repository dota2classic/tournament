import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameResultsEvent } from '../../gateway/events/gs/game-results.event';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { BracketService } from '../../rest/tournament/bracket.service';

@EventsHandler(GameResultsEvent)
export class GameResultsHandler implements IEventHandler<GameResultsEvent> {
  constructor(
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    private readonly bService: BracketService,
  ) {}

  async handle(event: GameResultsEvent) {
    const connectedMatch = await this.bracketMatchEntityRepository.findOne({
      externalMatchId: event.matchId,
    });

    if (!connectedMatch) return;

    if (!connectedMatch.opponent1?.id || !connectedMatch.opponent2?.id) {
      console.error(`WTF?`);
      return;
    }

    const offset = connectedMatch.teamOffset;

    // offset = 0 => radiant = opp1, dire = opp2
    // offset = 1 => radiant = opp2, dire = opp1
    const winCondition = offset === 0 ? event.radiantWin : !event.radiantWin;

    await this.bService.matchResults(
      connectedMatch.id,
      winCondition ? connectedMatch.opponent1.id : connectedMatch.opponent2.id,
    );
  }
}
