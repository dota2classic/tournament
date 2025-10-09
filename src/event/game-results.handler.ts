import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameResultsEvent } from '../gateway/events/gs/game-results.event';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { Bracket2Service } from '../service/bracket2.service';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { MatchGameService } from '../service/match-game.service';

@EventsHandler(GameResultsEvent)
export class GameResultsHandler implements IEventHandler<GameResultsEvent> {
  constructor(
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<BracketMatchGameEntity>,
    private readonly bService: Bracket2Service,
    @InjectRepository(TournamentParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      TournamentParticipantEntity
    >,
    private readonly matchGameService: MatchGameService,
  ) {}

  async handle(event: GameResultsEvent) {
    throw 'TODO IMPLEMENT';
    // const game = await this.matchGameEntityRepository.findOneBy({
    //   externalMatchId: event.matchId,
    // });
    // if (!game) return;
    //
    // const match = await this.bracketMatchEntityRepository.findOneById(
    //   game.bm_id,
    // );
    //
    // if (!match) return;
    //
    // if (!match.opponent1?.id || !match.opponent2?.id) {
    //   console.error(`WTF?`);
    //   return;
    // }
    //
    // // offset = 0 => radiant = opp1, dire = opp2
    // // offset = 1 => radiant = opp2, dire = opp1
    // const winCondition =
    //   game.teamOffset === 0
    //     ? event.winner === DotaTeam.RADIANT
    //     : event.winner === DotaTeam.DIRE;
    //
    // const winnerId = winCondition ? match.opponent1.id : match.opponent2.id;
    //
    // const res = await this.bracketParticipantEntityRepository.findOneById(
    //   winnerId,
    // );
    //
    // await this.matchGameService.setWinner(game.id, res.name);
  }
}
