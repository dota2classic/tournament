import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { TournamentRegistrationState } from '../model/tournament.dto';

@Injectable()
export class ParticipationService {
  constructor(
    @InjectRepository(TournamentParticipantEntity)
    private readonly tournamentParticipantEntityRepository: Repository<
      TournamentParticipantEntity
    >,
    @InjectRepository(TournamentRegistrationEntity)
    private readonly tournamentRegistrationEntityRepository: Repository<
      TournamentRegistrationEntity
    >,
    @InjectRepository(TournamentRegistrationPlayerEntity)
    private readonly tournamentRegistrationPlayerEntityRepository: Repository<
      TournamentRegistrationPlayerEntity
    >,
    private readonly ds: DataSource,
  ) {}

  public async registerAsParty(
    tournamentId: number,
    steamIds: string[],
  ): Promise<TournamentRegistrationEntity> {
    return await this.ds.transaction(async tx => {
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
            t => t.steam_id,
          )} уже зарегистрированы`,
        );
      }

      const reg = await tx.save(new TournamentRegistrationEntity(tournamentId));

      // First, we validate that no other player registration exists in this tournament
      reg.players = await tx.save(
        steamIds.map(
          steamId => new TournamentRegistrationPlayerEntity(steamId, reg.id),
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
      | TournamentRegistrationState.DECLINED
      | TournamentRegistrationState.TIMED_OUT,
  ) {
    await this.ds.transaction(async tx => {
      const player = await tx
        .getRepository<TournamentRegistrationPlayerEntity>(
          TournamentRegistrationPlayerEntity,
        )
        .createQueryBuilder('trp')
        .innerJoin('trp.registration', 'tr')
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
      // TODO: emit something?
    });
  }
}
