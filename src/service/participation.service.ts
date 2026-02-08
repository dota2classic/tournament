import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ParticipantEntity } from '../db/entity/participant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { TournamentRegistrationState } from '../model/tournament.dto';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { TournamentStatus } from '../gateway/shared-types/tournament';

const VALID_REGISTRATION_STATUSES: TournamentStatus[] = [
  TournamentStatus.REGISTRATION,
  TournamentStatus.READY_CHECK,
];
@Injectable()
export class ParticipationService {
  constructor(
    @InjectRepository(ParticipantEntity)
    private readonly tournamentParticipantEntityRepository: Repository<ParticipantEntity>,
    @InjectRepository(TournamentRegistrationEntity)
    private readonly tournamentRegistrationEntityRepository: Repository<TournamentRegistrationEntity>,
    @InjectRepository(TournamentRegistrationPlayerEntity)
    private readonly tournamentRegistrationPlayerEntityRepository: Repository<TournamentRegistrationPlayerEntity>,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    private readonly ds: DataSource,
  ) {}

  public async unregisterPlayer(tournamentId: number, steamId: string) {
    await this.ds.transaction(async (tx) => {
      // First, we need to find existing registration and tournamnet for it.
      const alreadyRegistered = await tx
        .createQueryBuilder()
        .select('tr.id', 'registration_id')
        .from('tournament_registration_player', 'trp')
        .innerJoin(
          'tournament_registration',
          'tr',
          'tr.id = trp.tournament_registration_id',
        )
        .where('tr.tournament_id = :tournamentId', { tournamentId })
        .andWhere('trp.steam_id = :steamId', { steamId })
        .getRawOne<{ registration_id: number }>();

      if (!alreadyRegistered) {
        throw new BadRequestException('Not registered');
      }

      const tournament = await tx.findOneBy<TournamentEntity>(
        TournamentEntity,
        {
          id: tournamentId,
        },
      );

      // Check that status is valid
      if (!VALID_REGISTRATION_STATUSES.includes(tournament.state)) {
        throw new BadRequestException('Invalid state for register');
      }

      // Delete players
      await tx.delete(TournamentRegistrationPlayerEntity, {
        tournamentRegistrationId: alreadyRegistered.registration_id,
      });

      // Delete registration
      await tx.delete(TournamentRegistrationEntity, {
        id: alreadyRegistered.registration_id,
      });
    });
  }

  public async registerAsParty(
    tournamentId: number,
    steamIds: string[],
  ): Promise<TournamentRegistrationEntity> {
    return await this.ds.transaction(async (tx) => {
      const alreadyRegistered = await tx
        .createQueryBuilder()
        .select('trp.steam_id', 'steam_id')
        .from('tournament_registration_player', 'trp')
        .innerJoin(
          'tournament_registration',
          'tr',
          'tr.id = trp.tournament_registration_id',
        )
        .where('tr.tournament_id = :tournamentId', { tournamentId })
        .andWhere('trp.steam_id IN (:...steamIds)', { steamIds })
        .getRawMany<{ steam_id: string }>();

      if (alreadyRegistered.length > 0) {
        throw new BadRequestException(
          `Игроки ${alreadyRegistered.map(
            (t) => t.steam_id,
          )} уже зарегистрированы`,
        );
      }

      const tournament = await this.tournamentEntityRepository.findOneBy({
        id: tournamentId,
      });

      // Check that status is valid
      if (!VALID_REGISTRATION_STATUSES.includes(tournament.state)) {
        throw new BadRequestException('Invalid state for register');
      }

      if (steamIds.length > tournament.teamSize) {
        throw new BadRequestException('Party too big for this tournament');
      }

      let startingState: TournamentRegistrationState =
        TournamentRegistrationState.CREATED;
      if (tournament.state === TournamentStatus.READY_CHECK) {
        startingState = TournamentRegistrationState.PENDING_CONFIRMATION;
      }

      const reg = await tx.save(
        new TournamentRegistrationEntity(
          tournamentId,
          undefined,
          startingState,
        ),
      );

      // First, we validate that no other player registration exists in this tournament
      reg.players = await tx.save(
        steamIds.map(
          (steamId) =>
            new TournamentRegistrationPlayerEntity(
              steamId,
              reg.id,
              startingState,
            ),
        ),
      );
      return reg;
    });
  }

  public async setRegistrationConfirmed(
    tournamentId: number,
    steamId: string,
    state:
      | TournamentRegistrationState.CONFIRMED
      | TournamentRegistrationState.DECLINED,
  ) {
    await this.ds.transaction(async (tx) => {
      const player = await tx
        .getRepository<TournamentRegistrationPlayerEntity>(
          TournamentRegistrationPlayerEntity,
        )
        .createQueryBuilder('trp')
        .innerJoinAndSelect('trp.registration', 'tr')
        .where('trp.steamId = :steamId', { steamId })
        .andWhere('tr.tournamentId = :tournamentId', { tournamentId })
        .getOne();

      if (!player) {
        throw new NotFoundException();
      }
      if (player.state !== TournamentRegistrationState.PENDING_CONFIRMATION) {
        throw new BadRequestException('Can only confirm when pending');
      }

      await tx.update(
        TournamentRegistrationPlayerEntity,
        {
          steamId: player.steamId,
          tournamentRegistrationId: player.tournamentRegistrationId,
        },
        {
          state,
        },
      );

      const reg = await tx.findOne<TournamentRegistrationEntity>(
        TournamentRegistrationEntity,
        {
          where: { id: player.tournamentRegistrationId },
          relations: ['players'],
        },
      );

      // We should update total only if all states are resolved
      const shouldUpdateTotalStatus =
        reg.players.findIndex(
          (t) => t.state === TournamentRegistrationState.PENDING_CONFIRMATION,
        ) === -1;

      if (!shouldUpdateTotalStatus) {
        return;
      }

      const isAllAccepted =
        reg.players.findIndex(
          (plr) => plr.state !== TournamentRegistrationState.CONFIRMED,
        ) === -1;

      const isAnyoneDeclined =
        reg.players.findIndex(
          (plr) => plr.state !== TournamentRegistrationState.DECLINED,
        ) !== -1;

      // Update status based on stuff
      if (isAllAccepted) {
        reg.state = TournamentRegistrationState.CONFIRMED;
        await tx.save(reg);
      } else if (isAnyoneDeclined) {
        reg.state = TournamentRegistrationState.DECLINED;
        await tx.save(reg);
      }

      // TODO: emit something?
    });
  }
}
