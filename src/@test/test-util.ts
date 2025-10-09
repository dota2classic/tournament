import { TestEnvironment, testUser } from './useFullModule';
import {
  BestOfStrategy,
  TournamentEntity,
} from '../db/entity/tournament.entity';
import {
  BracketType,
  TournamentStatus,
} from '../gateway/shared-types/tournament';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { TournamentRegistrationState } from '../model/tournament.dto';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { TournamentParticipantPlayerEntity } from '../db/entity/tournament-participant-player.entity';

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
) => {
  const tour = new TournamentEntity(
    teamSize,
    `tournament ${Math.random()}`,
    bracket,
    'Description',
    'imageurl',
    new Date('2030-01-01'),
    {
      round: 1,
      final: 1,
      grandFinal: 1,
    },
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
      players.map(plr => new TournamentRegistrationPlayerEntity(plr, reg.id)),
    );
  return reg;
};

export const createTournamentWithParticipants = async (
  te: TestEnvironment,
  state: TournamentStatus,
  participantCount: number,
  teamSize: number = 1,
  bracketType = BracketType.SINGLE_ELIMINATION,
) => {
  const tour = await createTournament(te, teamSize, bracketType, state);
  tour.participants = [];
  for (let i = 0; i < participantCount; i++) {
    const p = await te
      .repo(TournamentParticipantEntity)
      .save(new TournamentParticipantEntity(tour.id));
    p.players = [
      await te
        .repo(TournamentParticipantPlayerEntity)
        .save(new TournamentParticipantPlayerEntity(p.id, testUser())),
    ];
    tour.participants.push(p);
  }

  return tour;
};
