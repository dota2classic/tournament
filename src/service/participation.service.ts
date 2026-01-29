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

      const tournamentState = await this.tournamentEntityRepository.findOneBy({
        id: tournamentId,
      });

      let startingState: TournamentRegistrationState =
        TournamentRegistrationState.CREATED;
      if (tournamentState.state === TournamentStatus.READY_CHECK) {
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
