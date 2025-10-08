import { testUser, useFullModule } from '../@test/useFullModule';
import {
  BestOfOne,
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
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';

describe('TournamentService', () => {
  const te = useFullModule();
  let service: TournamentService;

  const createRegistration = async (playerCount = 2) => {
    const tournament = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      TournamentStatus.REGISTRATION,
    );
    // Create registration
    return await createTournamentRegistration(
      te,
      tournament.id,
      Array.from({ length: playerCount }).map(testUser),
    );
  };

  beforeEach(() => {
    service = te.service(TournamentService);
  });

  describe('createTournament', () => {
    it('should create a tournament', async () => {
      await expect(
        service.createTournament(
          2,
          '',
          BracketType.SINGLE_ELIMINATION,
          '',
          '',
          new Date(),
          BestOfOne,
        ),
      ).toBeDefined();
    });

    it('should validate team size', async () => {
      await expect(
        service.createTournament(
          -1,
          '',
          BracketType.SINGLE_ELIMINATION,
          '',
          '',
          new Date(),
          BestOfOne,
        ),
      ).rejects.toThrow();

      await expect(
        service.createTournament(
          6,
          '',
          BracketType.SINGLE_ELIMINATION,
          '',
          '',
          new Date(),
          BestOfOne,
        ),
      ).rejects.toThrow();
    });
  });

  describe('finishRegistration', () => {
    it('should throw if wrong status for finishing', async () => {
      // Given
      const tournament = await createTournament(
        te,
        2,
        BracketType.SINGLE_ELIMINATION,
        TournamentStatus.DRAFT,
      );
      // When
      await expect(() =>
        service.finishRegistration(tournament.id),
      ).rejects.toThrow();
    });

    it('should change tournament state', async () => {
      // Given
      let rg = await createRegistration(0);

      // When
      await service.finishRegistration(rg.tournamentId);

      // Then
      const tournament = await te
        .repo(TournamentEntity)
        .findOne({ where: { id: rg.tournamentId } });
      expect(tournament.state).toEqual(TournamentStatus.READY_CHECK);
    });

    it('should set timed_out state to not confirmed', async () => {
      // Given
      let rg = await createRegistration();

      // When
      await service.finishRegistration(rg.tournamentId);

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

    it('should handle all-confirms', async () => {
      // Given
      let rg = await createRegistration();

      rg.players.forEach(
        plr => (plr.state = TournamentRegistrationState.CONFIRMED),
      );
      await te.repo(TournamentRegistrationPlayerEntity).save(rg.players);

      // When
      await service.finishRegistration(rg.tournamentId);

      // Then
      rg = await te
        .repo(TournamentRegistrationEntity)
        .findOne({ where: { id: rg.id }, relations: ['players'] });
      expect(rg.state).toEqual(TournamentRegistrationState.CONFIRMED);
      expect(rg.players.map(t => t.state)).toEqual([
        TournamentRegistrationState.CONFIRMED,
        TournamentRegistrationState.CONFIRMED,
      ]);
    });

    // Если кто-то из группы не принял, то вся группа считается "непринявшей"
    it('should handle semi-confirms', async () => {
      // Given
      let rg = await createRegistration();

      rg.players[0].state = TournamentRegistrationState.CONFIRMED;
      rg.players[1].state = TournamentRegistrationState.PENDING_CONFIRMATION;
      await te.repo(TournamentRegistrationPlayerEntity).save(rg.players);

      // When
      await service.finishRegistration(rg.tournamentId);

      // Then
      rg = await te
        .repo(TournamentRegistrationEntity)
        .findOne({ where: { id: rg.id }, relations: ['players'] });
      expect(rg.state).toEqual(TournamentRegistrationState.DECLINED);
      expect(rg.players.map(t => t.state)).toEqual([
        TournamentRegistrationState.CONFIRMED,
        TournamentRegistrationState.TIMED_OUT,
      ]);
    });
  });
});
