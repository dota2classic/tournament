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
import { ParticipantEntity } from '../db/entity/participant.entity';

describe('TournamentService', () => {
  const te = useFullModule();
  let service: TournamentService;

  const createRegistration = async (playerCount = 2) => {
    const tournament = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      TournamentStatus.READY_CHECK,
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

  describe('finishReadyCheck', () => {
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
        service.finishReadyCheck(tournament.id),
      ).rejects.toThrow();
    });

    it('should set timed_out state to not confirmed', async () => {
      // Given
      let rg = await createRegistration();

      // When
      await service.finishReadyCheck(rg.tournamentId);

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
      await service.finishReadyCheck(rg.tournamentId);

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
      await service.finishReadyCheck(rg.tournamentId);

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

  describe('startTournament', () => {
    it('should convert participants into players', async () => {
      // Given
      const tournament = await createTournament(
        te,
        1,
        BracketType.SINGLE_ELIMINATION,
        TournamentStatus.READY_CHECK,
      );

      const registrations: TournamentRegistrationEntity[] = [];
      for (let i = 0; i < 4; i++) {
        // Create registration
        registrations.push(
          await createTournamentRegistration(
            te,
            tournament.id,
            [testUser()],
            TournamentRegistrationState.CONFIRMED,
          ),
        );
      }

      // When
      await service.startTournament(tournament.id);

      // Then
      const participants = await te.repo(ParticipantEntity).find({
        where: {
          tournament_id: tournament.id,
        },
        relations: ['players'],
      });

      expect(participants).toHaveLength(4);

      expect(
        participants
          .flatMap(t => t.players.map(player => player.steamId))
          .sort(),
      ).toEqual(
        registrations
          .flatMap(t => t.players.map(player => player.steamId))
          .sort(),
      );
    });

    it('should ignore not-confirmed participants', async () => {
      // Given
      const tournament = await createTournament(
        te,
        1,
        BracketType.SINGLE_ELIMINATION,
        TournamentStatus.READY_CHECK,
      );

      const registrations: TournamentRegistrationEntity[] = [];
      for (let i = 0; i < 4; i++) {
        // Create registration
        registrations.push(
          await createTournamentRegistration(
            te,
            tournament.id,
            [testUser()],
            TournamentRegistrationState.CONFIRMED,
          ),
        );
      }

      // Bad one
      registrations.push(
        await createTournamentRegistration(
          te,
          tournament.id,
          [testUser()],
          TournamentRegistrationState.TIMED_OUT,
        ),
      );

      // When
      await service.startTournament(tournament.id);

      // Then
      const participants = await te.repo(ParticipantEntity).find({
        where: {
          tournament_id: tournament.id,
        },
        relations: ['players'],
      });

      expect(participants).toHaveLength(4);

      expect(
        participants
          .flatMap(t => t.players.map(player => player.steamId))
          .sort(),
      ).toEqual(
        registrations
          .slice(0, 4)
          .flatMap(t => t.players.map(player => player.steamId))
          .sort(),
      );
    });
  });
});
