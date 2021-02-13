import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { BracketGameTimerReadyEvent } from './bracket-game-timer-ready.event';
import { isDev } from '../../../config/env';
import { BracketEntryType } from '../../../gateway/shared-types/tournament';
import { PlayerId } from '../../../gateway/shared-types/player-id';
import { TournamentGameReadyEvent } from '../../../gateway/events/tournament/tournament-game-ready.event';
import { MatchmakingMode } from '../../../gateway/shared-types/matchmaking-mode';
import { TournamentEntity } from '../../../db/entity/tournament.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BracketMatchEntity } from '../../../db/entity/bracket-match.entity';
import { MatchGameEntity } from '../../../db/entity/match-game.entity';
import { Logger } from '@nestjs/common';
import { BracketParticipantEntity } from '../../../db/entity/bracket-participant.entity';
import { TeamEntity } from '../../../db/entity/team.entity';
import { GameScheduleService } from '../../service/game-schedule.service';
import { inspect } from 'util';

@EventsHandler(BracketGameTimerReadyEvent)
export class BracketGameTimerReadyHandler
  implements IEventHandler<BracketGameTimerReadyEvent> {
  private readonly logger = new Logger(BracketGameTimerReadyHandler.name);

  constructor(
    private readonly ebus: EventBus,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
    @InjectRepository(BracketParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      BracketParticipantEntity
    >,
    @InjectRepository(TeamEntity)
    private readonly teamEntityRepository: Repository<TeamEntity>,
    private readonly scheduler: GameScheduleService,
  ) {}

  async handle(event: BracketGameTimerReadyEvent) {
    await this.initMatch(event.tournamentId, event.matchId, event.gameId);
  }

  private async isPreviousGameFinished(game: MatchGameEntity) {
    const allGames = await this.matchGameEntityRepository.find({
      bm_id: game.bm_id,
    });
    return (
      game.number === 1 ||
      allGames.find(t => t.number === game.number - 1)?.finished === true
    );
  }

  private async initMatch(
    tournamentId: number,
    matchId: number,
    gameId: number,
  ) {
    const tour = await this.tournamentEntityRepository.findOne(tournamentId);
    const b = await this.bracketMatchEntityRepository.findOne(matchId);
    const game = await this.matchGameEntityRepository.findOne(gameId);

    // no need to start matches if it's dev
    if (isDev) {
      this.logger.log(`Dev mode, not processing timer-ready event`)
      // this.logger.log(inspect(game))
      return;
    }

    if (game.finished) {
      // not needed 4 some reason
      this.logger.warn(`No need to start game: it is finished`);
      return;
    }

    if (!(await this.isPreviousGameFinished(game))) {
      this.logger.log(`Previous games not finished yet, reschedule`);
      // need to reschedule
      await this.reSchedule(
        tournamentId,
        matchId,
        gameId,
        new Date(game.scheduledDate.getTime() + 1000 * 60 * 5), // 5 min reschedule
      );
      return;
    }

    console.log(`Time has come, start game ${gameId}`);

    if (!b.opponent1?.id || !b.opponent2?.id) {
      this.logger.warn(`Can't start match game yet: not enough opponents`);

      await this.reSchedule(
        tournamentId,
        matchId,
        gameId,
        new Date(game.scheduledDate.getTime() + 1000 * 60 * 5),
      );
      return;
    }

    const opp1 = await this.bracketParticipantEntityRepository.findOne(
      b.opponent1.id,
    );
    const opp2 = await this.bracketParticipantEntityRepository.findOne(
      b.opponent2.id,
    );

    if (tour.entryType === BracketEntryType.PLAYER) {
      let teams = [[new PlayerId(opp1.name)], [new PlayerId(opp2.name)]];

      teams = BracketGameTimerReadyHandler.applyOffset(teams, game.teamOffset);

      this.startTournamentGame(
        tournamentId,
        gameId,
        MatchmakingMode.TOURNAMENT_SOLOMID,
        teams[0],
        teams[1],
      );
    } else {
      // ok here we query teams
      const team1 = await this.teamEntityRepository.findOne(opp1.name, {
        relations: ['members'],
      });
      const team2 = await this.teamEntityRepository.findOne(opp2.name, {
        relations: ['members'],
      });

      let teams = [
        team1.members.map(t => new PlayerId(t.steam_id)),
        team2.members.map(t => new PlayerId(t.steam_id)),
      ];

      teams = BracketGameTimerReadyHandler.applyOffset(teams, game.teamOffset);

      this.startTournamentGame(
        tournamentId,
        gameId,
        MatchmakingMode.TOURNAMENT,
        teams[0],
        teams[1],
      );
    }
  }

  private static applyOffset(
    teams: PlayerId[][],
    offset: number,
  ): PlayerId[][] {
    if (offset === 1) {
      // if offset is present we change teams
      return [teams[1], teams[0]];
    }
    return teams;
  }

  private startTournamentGame(
    tournamentId: number,
    gameId: number,
    mode: MatchmakingMode,
    radiant: PlayerId[],
    dire: PlayerId[],
  ) {
    this.ebus.publish(
      new TournamentGameReadyEvent(
        tournamentId, // tournament id
        gameId, // game id
        mode,
        radiant,
        dire,
      ),
    );
  }

  private async reSchedule(
    tournamentId: number,
    matchId: number,
    gameId: number,
    newDate: Date,
  ) {
    this.scheduler.scheduleGame(
      tournamentId,
      matchId,
      gameId,
      newDate.getTime(),
    );
  }
}
