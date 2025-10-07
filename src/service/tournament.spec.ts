import { useFullModule } from '../@test/useFullModule';
import { createTournament } from '../@test/test-util';
import {
  BracketType,
  TournamentStatus,
} from '../gateway/shared-types/tournament';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';

describe('TournamentService', () => {
  const te = useFullModule();

  it('should finish registration', async () => {
    // Given
    const tournament = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      TournamentStatus.REGISTRATION,
    );
    // Create registration
    const reg = await te
      .repo(TournamentRegistrationEntity)
      .save(new TournamentRegistrationEntity(tournament.id));
    await te
      .repo(TournamentRegistrationPlayerEntity)
      .save(new TournamentRegistrationPlayerEntity('123', reg.id));

    // When

    // Then
  });
});
