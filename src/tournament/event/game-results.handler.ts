import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameResultsEvent } from '../../gateway/events/gs/game-results.event';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { BracketService } from '../service/bracket.service';
import { MatchGameEntity } from '../../db/entity/match-game.entity';
import { BracketParticipantEntity } from '../../db/entity/bracket-participant.entity';
import { MatchGameService } from '../service/match-game.service';
import { DotaTeam } from '../../gateway/shared-types/dota-team';

@EventsHandler(GameResultsEvent)
export class GameResultsHandler implements IEventHandler<GameResultsEvent> {
  constructor(
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
    private readonly bService: BracketService,
    @InjectRepository(BracketParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      BracketParticipantEntity
    >,
    private readonly matchGameService: MatchGameService,
  ) {}

  async handle(event: GameResultsEvent) {
    const game = await this.matchGameEntityRepository.findOneBy({
      externalMatchId: event.matchId,
    });
    if (!game) return;

    const match = await this.bracketMatchEntityRepository.findOneById(
      game.bm_id,
    );

    if (!match) return;

    if (!match.opponent1?.id || !match.opponent2?.id) {
      console.error(`WTF?`);
      return;
    }

    // offset = 0 => radiant = opp1, dire = opp2
    // offset = 1 => radiant = opp2, dire = opp1
    const winCondition =
      game.teamOffset === 0
        ? event.winner === DotaTeam.RADIANT
        : event.winner === DotaTeam.DIRE;

    const winnerId = winCondition ? match.opponent1.id : match.opponent2.id;

    const res = await this.bracketParticipantEntityRepository.findOneById(
      winnerId,
    );

    await this.matchGameService.setWinner(game.id, res.name);
  }
}
