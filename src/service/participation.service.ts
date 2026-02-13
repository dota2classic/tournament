import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ParticipantEntity } from '../db/entity/participant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { TournamentRegistrationState } from '../model/tournament.dto';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { TournamentStatus } from '../gateway/shared-types/tournament';
import { BracketsManager } from 'brackets-manager';
import { groupBy } from '../util/group-by';
import { StageStandingsDto } from '../model/bracket.dto';
import { RegistrationInvitationEntity } from '../db/entity/registration-invitation.entity';
import { EventBus } from '@nestjs/cqrs';
import { TournamentRegistrationInvitationCreatedEvent } from '../gateway/events/tournament/tournament-registration-invitation-created.event';
import { TournamentRegistrationInvitationResolvedEvent } from '../gateway/events/tournament/tournament-registration-invitation-resolved.event';

const VALID_REGISTRATION_STATUSES: TournamentStatus[] = [
  TournamentStatus.REGISTRATION,
  TournamentStatus.READY_CHECK,
];
@Injectable()
export class ParticipationService {
  private logger = new Logger(ParticipationService.name);

  constructor(
    @InjectRepository(ParticipantEntity)
    private readonly tournamentParticipantEntityRepository: Repository<ParticipantEntity>,
    @InjectRepository(TournamentRegistrationEntity)
    private readonly regRepo: Repository<TournamentRegistrationEntity>,
    @InjectRepository(TournamentRegistrationPlayerEntity)
    private readonly regPlayerRepo: Repository<TournamentRegistrationPlayerEntity>,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    private readonly bm: BracketsManager,
    @InjectRepository(RegistrationInvitationEntity)
    private readonly regInviteRepo: Repository<RegistrationInvitationEntity>,
    private readonly ds: DataSource,
    private readonly ebus: EventBus,
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

      if (state === TournamentRegistrationState.DECLINED) {
        reg.state = TournamentRegistrationState.DECLINED;
        await tx.save(reg);
        return;
        // Set whole party as declined
      }

      const isAllAccepted =
        reg.players.findIndex(
          (t) => t.state !== TournamentRegistrationState.CONFIRMED,
        ) === -1;

      // Update status based on stuff
      if (isAllAccepted) {
        reg.state = TournamentRegistrationState.CONFIRMED;
        await tx.save(reg);
      }
      // TODO: emit something?
    });
  }

  public async invitePlayerToRegistration(
    tournamentId: number,
    inviterSteamId: string,
    steamId: string,
  ) {
    // First, find active reg for player
    const reg = await this.regPlayerRepo
      .createQueryBuilder('trp')
      .leftJoinAndSelect('trp.registration', 'reg')
      .where('reg.tournament_id = :tournamentId', { tournamentId })
      .andWhere('trp.steam_id = :steamId', { steamId: inviterSteamId })
      .getOne();
    if (!reg) {
      throw new BadRequestException('No registration');
    }

    // Ok, there is a registration. create an invitation
    const inv = await this.regInviteRepo.save(
      new RegistrationInvitationEntity(
        inviterSteamId,
        steamId,
        reg.registration.id,
        reg.registration.tournamentId,
      ),
    );

    // Emit invitation event
    this.ebus.publish(
      new TournamentRegistrationInvitationCreatedEvent(
        reg.registration.tournamentId,
        inviterSteamId,
        steamId,
        reg.tournamentRegistrationId,
        inv.id,
      ),
    );
    return inv;
  }

  public async acceptRegistrationInvitation(
    invitationId: string,
    accept: boolean,
  ) {
    const invite = await this.regInviteRepo.findOneBy({ id: invitationId });
    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    if (!accept) {
      await this.regInviteRepo.remove(invite);
      this.ebus.publish(
        new TournamentRegistrationInvitationResolvedEvent(
          invite.inviterSteamId,
          invite.steamId,
          accept,
        ),
      );
      return;
    }

    const tournament = await this.tournamentEntityRepository.findOneBy({
      id: invite.tournamentId,
    });

    if (!VALID_REGISTRATION_STATUSES.includes(tournament.state)) {
      throw new BadRequestException('Wrong tournament state');
    }

    await this.ds.transaction(async (tx) => {
      // Select registration for update
      const reg = await tx
        .createQueryBuilder<TournamentRegistrationEntity>(
          TournamentRegistrationEntity,
          'reg',
        )
        .innerJoinAndSelect('reg.players', 'players')
        .where('reg.id = :regId', { regId: invite.registrationId })
        .setLock('pessimistic_write') // SELECT ... FOR UPDATE
        .getOne();

      if (!reg) {
        throw new BadRequestException("Registration doesn't exist");
      }

      if (reg.players.length >= tournament.teamSize) {
        throw new BadRequestException('Team is full');
      }

      this.logger.log(`Registration acquired ${reg.id}`);

      // Select existing participation for update
      const existingPlayerReg = await tx
        .createQueryBuilder<TournamentRegistrationPlayerEntity>(
          TournamentRegistrationPlayerEntity,
          'rpe',
        )
        .where('rpe.steam_id = :steamId', { steamId: invite.steamId })
        .innerJoin('rpe.registration', 'registration')
        .andWhere('registration.tournament_id = :tournamentId', {
          tournamentId: invite.tournamentId,
        })
        .setLock('pessimistic_write') // SELECT ... FOR UPDATE
        .getOne();

      this.logger.log(
        `Is player already in some registration? ${existingPlayerReg != null}`,
      );

      if (existingPlayerReg) {
        // we need to delete it
        await tx.update<TournamentRegistrationPlayerEntity>(
          TournamentRegistrationPlayerEntity,
          {
            steamId: existingPlayerReg.steamId,
            tournamentRegistrationId:
              existingPlayerReg.tournamentRegistrationId,
          },
          {
            tournamentRegistrationId: reg.id,
          },
        );
        this.logger.log(
          'Changed registration id of existing player registration, because it existed',
        );
      } else {
        await tx.save(
          TournamentRegistrationPlayerEntity,
          new TournamentRegistrationPlayerEntity(
            invite.steamId,
            reg.id,
            reg.state,
          ),
        );
        this.logger.log('Created new player registration');
      }

      await tx.delete(RegistrationInvitationEntity, invite);
      this.logger.log(
        'Player invitation accepting is complete! Removed invitation',
      );

      this.ebus.publish(
        new TournamentRegistrationInvitationResolvedEvent(
          invite.inviterSteamId,
          invite.steamId,
          true,
        ),
      );
    });
  }

  public async getFinalStandings(id: number): Promise<StageStandingsDto[]> {
    const t = await this.tournamentEntityRepository.findOne({
      where: { id },
      relations: ['stages'],
    });
    return await Promise.all(
      t.stages.map(async (stage) => {
        const standings = await this.bm.get.finalStandings(stage.id);
        // Load all participants in batch
        const participantMap: Map<number, ParticipantEntity> = groupBy(
          await this.tournamentParticipantEntityRepository.find({
            where: {
              id: In(standings.map((t) => t.id)),
            },
            relations: ['players'],
          }),
          'id',
        );

        return {
          name: stage.name,
          stage_id: stage.id,
          standings: standings.map((st) => ({
            rank: st.rank,
            participant: participantMap.get(Number(st.id)),
          })),
        } satisfies StageStandingsDto;
      }),
    );
  }
}
