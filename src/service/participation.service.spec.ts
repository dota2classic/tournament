import { testUser, useFullModule } from '../@test/useFullModule';
import { ParticipationService } from './participation.service';
import { createFinishedTournament, createTournament } from '../@test/test-util';
import { TournamentRegistrationState } from '../model/tournament.dto';
import {
  BracketType,
  TournamentStatus,
} from '../gateway/shared-types/tournament';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';

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

  it('should unregister player from party', async () => {
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
    const regs = await te.repo(TournamentRegistrationPlayerEntity).find({
      where: { tournamentRegistrationId: re.id },
    });

    expect(regs).toHaveLength(1);
    expect(regs[0].steamId).toEqual('2');
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

  const assertState = async (
    id: number,
    state: TournamentRegistrationState,
  ) => {
    const reg = await te
      .repo(TournamentRegistrationEntity)
      .findOneBy({ id: id });
    expect(reg.state).toEqual(state);
  };

  it('should set party to READY if all are ready', async () => {
    // Given
    const t = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      TournamentStatus.READY_CHECK,
    );

    let reg = await service.registerAsParty(t.id, ['1', '2']);
    // Confirm one
    await service.setRegistrationConfirmed(
      t.id,
      '1',
      TournamentRegistrationState.CONFIRMED,
    );
    await assertState(reg.id, TournamentRegistrationState.PENDING_CONFIRMATION);

    // Confirm two
    await service.setRegistrationConfirmed(
      t.id,
      '2',
      TournamentRegistrationState.CONFIRMED,
    );
    await assertState(reg.id, TournamentRegistrationState.CONFIRMED);
  });

  it('should set party to DECLINED instantly if declined', async () => {
    // Given
    const t = await createTournament(
      te,
      2,
      BracketType.SINGLE_ELIMINATION,
      TournamentStatus.READY_CHECK,
    );

    let reg = await service.registerAsParty(t.id, ['1', '2']);
    // Confirm one
    await service.setRegistrationConfirmed(
      t.id,
      '1',
      TournamentRegistrationState.DECLINED,
    );
    await assertState(reg.id, TournamentRegistrationState.DECLINED);

    // Confirm two
    await service.setRegistrationConfirmed(
      t.id,
      '2',
      TournamentRegistrationState.CONFIRMED,
    );
    await assertState(reg.id, TournamentRegistrationState.DECLINED);
  });

  it('should give standings if tournament finished', async () => {
    // Given
    const t = await createFinishedTournament(te);

    const standings = await service.getFinalStandings(t.id);

    // 1 stage
    expect(standings).toHaveLength(1);
    // 4 participants = 4 standings
    expect(standings[0].standings).toHaveLength(4);
  });

  describe('registration invitations', () => {
    const createRegistrationInvite = async (teamSize: number) => {
      // Given
      const t = await createTournament(
        te,
        teamSize,
        BracketType.SINGLE_ELIMINATION,
        TournamentStatus.REGISTRATION,
      );

      const inviter = testUser();
      const invited = testUser();

      const reg = await te
        .service(ParticipationService)
        .registerAsParty(t.id, [inviter]);

      return await service.invitePlayerToRegistration(t.id, inviter, invited);
    };

    it.each([TournamentStatus.REGISTRATION, TournamentStatus.READY_CHECK])(
      'should add a player to registration if status <= ready_check and team size allows',
      async (state) => {
        const inv = await createRegistrationInvite(2);

        await te.repo(TournamentEntity).update(
          {
            id: inv.tournamentId,
          },
          { state },
        );

        // When
        await service.acceptRegistrationInvitation(inv.id, true);

        // Then
        await expect(
          te.repo(TournamentRegistrationPlayerEntity).findOneBy({
            steamId: inv.steamId,
            tournamentRegistrationId: inv.registrationId,
          }),
        ).resolves.not.toBeNull();
      },
    );

    it('should remove a player from previous registration on success', async () => {
      // Given
      const inv = await createRegistrationInvite(2);

      const oldReg = await te
        .service(ParticipationService)
        .registerAsParty(inv.tournamentId, [inv.steamId]);

      // When
      await service.acceptRegistrationInvitation(inv.id, true);

      // Then
      await expect(
        te.repo(TournamentRegistrationPlayerEntity).findOneBy({
          steamId: inv.steamId,
          tournamentRegistrationId: inv.registrationId,
        }),
      ).resolves.toBeDefined();

      await expect(
        te.repo(TournamentRegistrationPlayerEntity).findOneBy({
          steamId: inv.steamId,
          tournamentRegistrationId: oldReg.id,
        }),
      ).resolves.toBeFalsy();
    });

    it.each([
      TournamentStatus.DRAFT,
      TournamentStatus.IN_PROGRESS,
      TournamentStatus.FINISHED,
    ])('should not allow accepting in invalid state', async (state) => {
      const inv = await createRegistrationInvite(2);
      await te.repo(TournamentEntity).update(
        {
          id: inv.tournamentId,
        },
        { state },
      );

      // When + Then
      await expect(
        service.acceptRegistrationInvitation(inv.id, true),
      ).rejects.toThrow();
    });

    it('should not allow getting team size over tournament requirement', async () => {
      const inv = await createRegistrationInvite(1);

      // When + Then
      await expect(
        service.acceptRegistrationInvitation(inv.id, true),
      ).rejects.toThrow();
    });
  });
});
