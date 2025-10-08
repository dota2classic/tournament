import { testUser, useFullModule } from '../@test/useFullModule';
import {
  createTournament,
  createTournamentRegistration,
} from '../@test/test-util';
import {
  BracketType,
  TournamentStatus,
} from '../gateway/shared-types/tournament';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { TournamentService } from './tournament.service';
import { TournamentRegistrationState } from '../model/tournament.dto';

describe('TournamentService', () => {
  const te = useFullModule();
  let service: TournamentService;

  beforeEach(() => {
    service = te.service(TournamentService);
  });

  it('should set timed_out state to not confirmed', async () => {
    // Given
    const tournament = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      TournamentStatus.REGISTRATION,
    );
    // Create registration
    let rg = await createTournamentRegistration(te, tournament.id, [
      testUser(),
      testUser(),
    ]);

    // When
    await service.finishRegistration(tournament.id);

    // Then
    rg = await te
      .repo(TournamentRegistrationEntity)
      .findOne({ where: { id: rg.id }, relations: ['players'] });
    expect(rg.state).toEqual(TournamentRegistrationState.DECLINED);
    expect(rg.players.map(t => t.state)).toEqual([
      TournamentRegistrationState.TIMED_OUT,
      TournamentRegistrationState.TIMED_OUT,
    ]);
  });
});
