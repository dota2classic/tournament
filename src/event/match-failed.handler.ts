import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchFailedEvent } from '../gateway/events/match-failed.event';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ParticipantEntity } from '../db/entity/participant.entity';
import { ParticipantResult } from 'brackets-model';
import { Logger } from '@nestjs/common';
import { BracketMatchService } from '../service/bracket-match.service';

@EventsHandler(MatchFailedEvent)
export class MatchFailedHandler implements IEventHandler<MatchFailedEvent> {
  private logger = new Logger(MatchFailedHandler.name);

  constructor(
    @InjectRepository(BracketMatchGameEntity)
    private readonly bracketMatchGameEntityRepository: Repository<BracketMatchGameEntity>,
    @InjectRepository(ParticipantEntity)
    private readonly participantEntityRepository: Repository<ParticipantEntity>,
    private readonly matchService: BracketMatchService,
  ) {}

  async handle(event: MatchFailedEvent) {
    const gm = await this.bracketMatchGameEntityRepository.findOneBy({
      externalMatchId: event.matchId,
    });
    if (!gm) {
      return;
    }

    // Update game - detach match id
    await this.bracketMatchGameEntityRepository.update(
      {
        id: gm.id,
      },
      { externalMatchId: null },
    );

    const opponents = await this.participantEntityRepository.find({
      where: {
        id: In([gm.opponent1.id, gm.opponent2.id]),
      },
      relations: ['players'],
    });

    // First, we need to detect which team did not load.
    const opponent1Failed = this.didOpponentFail(
      opponents,
      gm.opponent1,
      event.failedPlayers,
    );

    const opponent2Failed = this.didOpponentFail(
      opponents,
      gm.opponent2,
      event.failedPlayers,
    );

    this.logger.log(
      `Tournament match failed for game ${gm.id}. Opp1 failed: ${opponent1Failed}, opp2 failed: ${opponent2Failed}`,
    );

    // None failed - weird case, should exit early and debug
    if (!opponent1Failed && !opponent2Failed) {
      this.logger.warn('Tournament match failed, but no opponent is failed.', {
        failedPlayers: event.failedPlayers,
        opponent1: opponents[0].players.map((t) => t.steamId),
        opponent2: opponents[1].players.map((t) => t.steamId),
      });
      return;
    }

    // Both failed
    if (opponent1Failed && opponent2Failed) {
      await this.handleBothFailed(gm, opponents, event);
      return;
    }

    // One of them failed
    if (opponent1Failed) {
      await this.handleOneFailed(gm, event, Number(gm.opponent2.id));
    } else if (opponent2Failed) {
      await this.handleOneFailed(gm, event, Number(gm.opponent1.id));
    }
  }

  private async handleOneFailed(
    gm: BracketMatchGameEntity,
    evt: MatchFailedEvent,
    winnerId: number,
  ) {
    await this.matchService.setGameWinner(gm.id, winnerId, evt.matchId);
  }

  private async handleBothFailed(
    gm: BracketMatchGameEntity,
    opponents: ParticipantEntity[],
    event: MatchFailedEvent,
  ) {
    // Handle that manually for now.
    this.logger.warn('Mutual forfeit: should be handled manually');
  }

  private didOpponentFail(
    opponents: ParticipantEntity[],
    opponent: ParticipantResult,
    failedPlayers: string[],
  ) {
    const ent = opponents.find((t) => t.id === opponent.id);

    return (
      ent.players.findIndex((plr) => failedPlayers.includes(plr.steamId)) !== -1
    );
  }
}
