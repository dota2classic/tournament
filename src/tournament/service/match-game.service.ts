import { Injectable } from '@nestjs/common';
import { MatchGameEntity } from '../../db/entity/match-game.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EventBus } from '@nestjs/cqrs';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { BracketParticipantEntity } from '../../db/entity/bracket-participant.entity';
import { BracketsManager } from 'brackets-manager';
import { UtilQuery } from './util-query';
import { BracketGameResultEvent } from '../event/bracket-game-result/bracket-game-result.event';

@Injectable()
export class MatchGameService {
  constructor(
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(BracketParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      BracketParticipantEntity
    >,
    private readonly manager: BracketsManager,
    private readonly utilQuery: UtilQuery,
    private readonly ebus: EventBus,
  ) {}

  /**
   *
   * @param gameId - id of MatchGameEntity
   * @param winnerId - either STEAM_ID or TEAM_ID
   */
  public async setWinner(gameId: number, winnerId: string) {
    const g = await this.matchGameEntityRepository.findOne(gameId);
    const m = await this.bracketMatchEntityRepository.findOne(g.bm_id);
    const opp1 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent1?.id,
    );
    const opp2 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent2?.id,
    );

    g.winner = winnerId === opp1.name ? opp1.id : opp2.id;
    g.finished = true;
    await this.matchGameEntityRepository.save(g);

    this.ebus.publish(
      new BracketGameResultEvent(
        gameId,
        winnerId === opp1.name ? 'opponent1' : 'opponent2',
      ),
    );

    return this.bracketMatchEntityRepository.findOne(m.id);
  }
}
