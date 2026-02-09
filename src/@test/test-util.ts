import { TestEnvironment, testUser } from './useFullModule';
import {
  BestOfStrategy,
  ScheduleStrategy,
  TournamentEntity,
} from '../db/entity/tournament.entity';
import {
  BracketType,
  TournamentStatus,
} from '../gateway/shared-types/tournament';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { TournamentRegistrationState } from '../model/tournament.dto';
import { ParticipantEntity } from '../db/entity/participant.entity';
import { ParticipantPlayerEntity } from '../db/entity/participant-player.entity';
import { TournamentService } from '../service/tournament.service';
import { ParticipationService } from '../service/participation.service';
import { BracketService } from '../service/bracket.service';
import { Dota_GameMode } from '../gateway/shared-types/dota-game-mode';
import { BracketCrud } from '../service/bracket.crud';
import { BracketMatchService } from '../service/bracket-match.service';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';

export const BestOfOne: BestOfStrategy = {
  round: 1,
  final: 1,
  grandFinal: 1,
};

export const createTournament = (
  te: TestEnvironment,
  teamSize: number = 2,
  bracket: BracketType = BracketType.SINGLE_ELIMINATION,
  state: TournamentStatus = TournamentStatus.DRAFT,
  round = 1,
  final = 1,
  grandFinal = 1,
  gameMode = Dota_GameMode.CAPTAINS_MODE,
  scheduleStrategy: ScheduleStrategy = {
    gameBreakDurationSeconds: 60 * 10,
    gameDurationSeconds: 60 * 50,
  },
) => {
  const tour = new TournamentEntity(
    teamSize,
    `tournament ${Math.random()}`,
    bracket,
    'Description',
    'imageurl',
    '100$',
    new Date('2030-01-01'),
    {
      round,
      final,
      grandFinal,
    },
    gameMode,
    scheduleStrategy,
  );
  tour.state = state;
  return te.repo(TournamentEntity).save(tour);
};

export const createTournamentRegistration = async (
  te: TestEnvironment,
  tournamentId: number,
  players: string[] = [testUser()],
  state = TournamentRegistrationState.CREATED,
) => {
  const reg = await te
    .repo(TournamentRegistrationEntity)
    .save(new TournamentRegistrationEntity(tournamentId, undefined, state));
  reg.players = await te
    .repo(TournamentRegistrationPlayerEntity)
    .save(
      players.map(
        (plr) => new TournamentRegistrationPlayerEntity(plr, reg.id, state),
      ),
    );
  return reg;
};

export const createTournamentWithParticipants = async (
  te: TestEnvironment,
  state: TournamentStatus,
  participantCount: number,
  teamSize: number = 1,
  bracketType = BracketType.SINGLE_ELIMINATION,
  bestOf: BestOfStrategy = { round: 1, final: 1, grandFinal: 1 },
) => {
  const tour = await createTournament(
    te,
    teamSize,
    bracketType,
    state,
    bestOf.round,
    bestOf.final,
    bestOf.grandFinal,
  );
  tour.participants = [];
  for (let i = 0; i < participantCount; i++) {
    const p = await te
      .repo(ParticipantEntity)
      .save(new ParticipantEntity(tour.id));
    p.players = [
      await te
        .repo(ParticipantPlayerEntity)
        .save(new ParticipantPlayerEntity(p.id, testUser())),
    ];
    tour.participants.push(p);
  }

  return tour;
};

export const createNativeTournament = async (
  te: TestEnvironment,
  bestOf: BestOfStrategy = {
    round: 1,
    final: 1,
    grandFinal: 1,
  },
  pc = 4,
) => {
  const ts = te.service(TournamentService);
  // Create tournament
  const t = await ts.createTournament(
    1,
    Math.random().toString(),
    BracketType.SINGLE_ELIMINATION,
    '123',
    '123',
    '123$',
    new Date(),
    bestOf,
    Dota_GameMode.CAPTAINS_MODE,
    {
      gameDurationSeconds: 60 * 50,
      gameBreakDurationSeconds: 60 * 10,
    },
  );

  // Publish
  await ts.publish(t.id);

  // Register
  const steamIds = Array.from({ length: pc }, testUser);
  for (let i = 0; i < pc; i++) {
    await te.service(ParticipationService).registerAsParty(t.id, [steamIds[i]]);
  }

  // Confirm ready check
  await ts.startReadyCheck(t.id);
  for (let i = 0; i < pc; i++) {
    await te
      .service(ParticipationService)
      .setRegistrationConfirmed(
        t.id,
        steamIds[i],
        TournamentRegistrationState.CONFIRMED,
      );
  }

  await ts.finishReadyCheck(t.id);
  await te.service(BracketService).generateBracket(t.id);
  return ts.getFullTournament(t.id);
};

export const createFinishedTournament = async (te: TestEnvironment) => {
  const t = await createNativeTournament(te);
  const br = await te.service(BracketCrud).getBracket(t.id);
  br.match.sort((a, b) => a.round_id - b.round_id);
  for (let m of br.match) {
    m = await te.repo(BracketMatchEntity).findOne({
      where: {
        id: m.id,
      },
      relations: ['games'],
    });
    console.log('Setting winner of game 1 match', m);
    await te
      .service(BracketMatchService)
      .setGameWinner(m.games[0].id, m.opponent1.id);
  }

  return t;
};
