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
) => {
  const reg = await te
    .repo(TournamentRegistrationEntity)
    .save(new TournamentRegistrationEntity(tournamentId));
  reg.players = await te
    .repo(TournamentRegistrationPlayerEntity)
    .save(
      players.map(plr => new TournamentRegistrationPlayerEntity(plr, reg.id)),
    );
  return reg;
};
