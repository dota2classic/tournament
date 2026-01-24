import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameResultsEvent } from '../gateway/events/gs/game-results.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { BracketMatchService } from '../service/bracket-match.service';
import { DotaTeam } from '../gateway/shared-types/dota-team';
import { Logger } from '@nestjs/common';

@EventsHandler(GameResultsEvent)
export class GameResultsHandler implements IEventHandler<GameResultsEvent> {
  private logger = new Logger(GameResultsHandler.name);
  constructor(
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<
      BracketMatchGameEntity
    >,
    private readonly bracketMatchService: BracketMatchService,
  ) {}

  async handle(event: GameResultsEvent) {
    const game = await this.matchGameEntityRepository.findOneBy({
      externalMatchId: event.matchId,
    });
    if (!game) return;

    this.logger.log('Tournament game finished! Updating...');

    // // offset = 0 => radiant = opp1, dire = opp2
    // // offset = 1 => radiant = opp2, dire = opp1
    const radiantOpponent =
      game.teamOffset === 0 ? game.opponent1.id : game.opponent2.id;
    const direOpponent =
      game.teamOffset === 0 ? game.opponent2.id : game.opponent1.id;

    let winnerId: string | number;
    if (event.winner === DotaTeam.RADIANT) {
      winnerId = radiantOpponent;
    } else {
      winnerId = direOpponent;
    }

    await this.bracketMatchService.setGameWinner(
      game.parent_id,
      game.id,
      winnerId,
      event.matchId,
    );
  }
}
