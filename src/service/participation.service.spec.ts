import { useFullModule } from '../@test/useFullModule';
import { ParticipationService } from './participation.service';
import { createTournament } from '../@test/test-util';
import { TournamentRegistrationState } from '../model/tournament.dto';
import {
  BracketType,
  TournamentStatus,
} from '../gateway/shared-types/tournament';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';

describe('ParticipationService', () => {
  const te = useFullModule();

  let service: ParticipationService;

  beforeEach(() => {
    service = te.service(ParticipationService);
  });

  it('should register a party into a tournament if it fits', async () => {
    // Given
    const t = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      TournamentStatus.REGISTRATION,
    );

    // When
    const re = await service.registerAsParty(t.id, ['1', '2']);

    // Then
    expect(re).toBeDefined();
    expect(re.players.map((t) => t.steamId).sort()).toEqual(['1', '2']);
    expect(re.state).toEqual(TournamentRegistrationState.CREATED);
  });

  it('should unregister whole party if player from party unregisters', async () => {
    // Given
    const t = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      TournamentStatus.REGISTRATION,
    );
    let re = await service.registerAsParty(t.id, ['1', '2']);

    // When
    await service.unregisterPlayer(t.id, '1');

    // Then
    await expect(
      te.repo(TournamentRegistrationEntity).count({
        where: { id: re.id },
      }),
    ).resolves.toEqual(0);
  });

  it('should not register a party which doesnt fit', async () => {
    // Given
    const t = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      TournamentStatus.REGISTRATION,
    );

    // When + Then
    await expect(
      service.registerAsParty(t.id, ['1', '2', '3']),
    ).rejects.toThrow();
  });

  it.each([
    TournamentStatus.DRAFT,
    TournamentStatus.IN_PROGRESS,
    TournamentStatus.FINISHED,
  ])('should not register a party if registration is over', async (state) => {
    // Given
    const t = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      state,
    );

    // When + Then
    await expect(service.registerAsParty(t.id, ['1'])).rejects.toThrow();
  });

  // TODO: write test
  // it('should update total party state when all players resovled', async () => {
  //
  // });
});
