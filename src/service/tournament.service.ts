import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BestOfStrategy,
  TournamentEntity,
} from '../db/entity/tournament.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  BracketType,
  TournamentStatus,
} from '../gateway/shared-types/tournament';
import { TournamentRegistrationState } from '../model/tournament.dto';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { typeormBulkUpdate } from '../util/typeorm-bulk-update';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { minimizeLeftovers } from '../util/permutations';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { TournamentParticipantPlayerEntity } from '../db/entity/tournament-participant-player.entity';
import { EventBus } from '@nestjs/cqrs';
import { TournamentReadyCheckStartedEvent } from '../gateway/events/tournament/tournament-ready-check-started.event';
import { TournamentReadyCheckDeclinedEvent } from '../gateway/events/tournament/tournament-ready-check-declined.event';

@Injectable()
export class TournamentService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    private readonly ebus: EventBus,
  ) {}

  /**
   * REGISTRATION -> READY_CHECK
   * Завершает регистрацию на турнир и запускает проверку на готовность
   * @param tournamentId
   */
  public async startReadyCheck(tournamentId: number) {
    const tournament = await this.getFullTournament(tournamentId);

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    if (tournament.state !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException(
        `Tournament must be in "registration" state!`,
      );
    }

    const notifyPlayers = await this.ds.transaction(async tx => {
      // Change tournament state
      await tx.update(
        TournamentEntity,
        {
          id: tournamentId,
        },
        { state: TournamentStatus.READY_CHECK },
      );
      // Change registration entries state
      await tx.update<TournamentRegistrationEntity>(
        TournamentRegistrationEntity,
        {
          tournamentId,
        },
        {
          state: TournamentRegistrationState.PENDING_CONFIRMATION,
        },
      );
      // Change registration player states to pending
      await tx.update<TournamentRegistrationPlayerEntity>(
        TournamentRegistrationPlayerEntity,
        {
          tournamentRegistrationId: In(tournament.registrations.map(t => t.id)),
        },
        {
          state: TournamentRegistrationState.PENDING_CONFIRMATION,
        },
      );

      return tx.find<TournamentRegistrationPlayerEntity>(
        TournamentRegistrationPlayerEntity,
        {
          where: {
            tournamentRegistrationId: In(
              tournament.registrations.map(t => t.id),
            ),
            state: TournamentRegistrationState.PENDING_CONFIRMATION,
          },
        },
      );
    });

    this.ebus.publishAll(
      notifyPlayers.map(
        plr => new TournamentReadyCheckStartedEvent(tournamentId, plr.steamId),
      ),
    );

    return this.getFullTournament(tournamentId);
  }

  /**
   * Создает сущность турнира в статус DRAFT
   * @param teamSize
   * @param name
   * @param bracketType
   * @param description
   * @param imageUrl
   * @param startDate
   * @param bestOfConfig
   */
  public async createTournament(
    teamSize: number,
    name: string,
    bracketType: BracketType,
    description: string,
    imageUrl: string,
    startDate: Date,
    bestOfConfig: BestOfStrategy,
  ) {
    if (teamSize > 5 || teamSize <= 0) {
      throw new BadRequestException('Team size must be > 0 and <= 5');
    }

    const t = await this.tournamentEntityRepository.save(
      new TournamentEntity(
        teamSize,
        name,
        bracketType,
        description,
        imageUrl,
        startDate,
        bestOfConfig,
      ),
    );
    return this.getFullTournament(t.id);
  }

  /**
   * DRAFT -> REGISTRATION
   * @param id
   */
  public async publish(id: number) {
    const tournament = await this.getFullTournament(id);
    if (tournament.state !== TournamentStatus.DRAFT) {
      throw new BadRequestException('Must be draft status to publish');
    }

    await this.tournamentEntityRepository.update(
      {
        id,
      },
      { state: TournamentStatus.REGISTRATION },
    );
    return this.getFullTournament(id);
  }

  /**
   * Завершает проверку на готовность и выставляет актуальные статусы для зарегистрированных игроков
   * READY_CHECK -> IN_PROGRESS
   * @param tournamentId
   */
  public async finishReadyCheck(tournamentId: number) {
    const tournament = await this.getFullTournament(tournamentId);
    if (tournament.state !== TournamentStatus.READY_CHECK) {
      throw new BadRequestException(
        'Tournament must be in ready check state to start',
      );
    }

    const timedOut: string[] = [];

    // For
    const updatedRegistrations = tournament.registrations.map(registration => {
      let isReady = true;
      for (let player of registration.players) {
        if (player.state === TournamentRegistrationState.CONFIRMED) {
          continue;
        }

        isReady = false;
        if (
          player.state === TournamentRegistrationState.PENDING_CONFIRMATION ||
          player.state === TournamentRegistrationState.CREATED
        ) {
          player.state = TournamentRegistrationState.TIMED_OUT;
          timedOut.push(player.steamId);
        }
      }

      registration.state = isReady
        ? TournamentRegistrationState.CONFIRMED
        : TournamentRegistrationState.DECLINED;

      if (!isReady) {
        this.ebus.publishAll(
          registration.players.map(
            plr =>
              new TournamentReadyCheckDeclinedEvent(
                tournamentId,
                registration.id,
                plr.steamId,
              ),
          ),
        );
      }

      return registration;
    });

    await this.ds.transaction(async tx => {
      const players: TournamentRegistrationPlayerEntity[] = updatedRegistrations.flatMap(
        t => t.players,
      );
      // Bulk update players
      if (players.length > 0) {
        const batches: unknown[][] = players.map(plr => [
          plr.steamId,
          plr.tournamentRegistrationId,
          plr.state,
        ]);
        const [parameters, placeholder] = typeormBulkUpdate(batches);

        await tx.query(
          `
        UPDATE tournament_registration_player AS trp
SET state = c.state::tournament_registration_state
FROM (VALUES
    ${placeholder}
) AS c(steam_id, tournament_registration_id, state)
WHERE c.steam_id = trp.steam_id
  AND trp.tournament_registration_id = c.tournament_registration_id::int;
      `,
          parameters,
        );
      }

      // Bulk update registrations
      if (updatedRegistrations.length > 0) {
        const batches = updatedRegistrations.map(reg => [reg.id, reg.state]);
        const [parameters, placeholder] = typeormBulkUpdate(batches);

        await tx.query(
          `
        UPDATE tournament_registration AS tr
SET state = c.state::tournament_registration_state
FROM (VALUES
    ${placeholder}
) AS c(id, state)
WHERE tr.id = c.id::int;
      `,
          parameters,
        );
      }

      // Change tournament state
      await tx.update(
        TournamentEntity,
        {
          id: tournamentId,
        },
        { state: TournamentStatus.IN_PROGRESS },
      );
    });

    await this.startTournament(tournamentId);

    return this.getFullTournament(tournamentId);
  }

  public async getFullTournament(id: number): Promise<TournamentEntity> {
    const tournament = await this.tournamentEntityRepository.findOne({
      where: {
        id,
      },
      relations: ['registrations', 'registrations.players'],
    });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return tournament;
  }

  private async startTournament(tournamentId: number) {
    const tournament = await this.getFullTournament(tournamentId);

    const confirmedParties = tournament.registrations.filter(
      t => t.state === TournamentRegistrationState.CONFIRMED,
    );

    // Fill participants
    const participants = this.registrationsToParticipants(
      confirmedParties,
      tournament.teamSize,
    );

    await this.ds.transaction(async tx => {
      // Create participants
      for (const participantCfg of participants) {
        // Create root entity
        const participant = await tx.save(
          TournamentParticipantEntity,
          new TournamentParticipantEntity(tournamentId, participantCfg.teamId),
        );
        // Create players
        await tx.save(
          TournamentParticipantPlayerEntity,
          participantCfg.players.map(
            steamId =>
              new TournamentParticipantPlayerEntity(participant.id, steamId),
          ),
        );
      }

      // Update tournament status
      await tx.update(
        TournamentEntity,
        {
          id: tournamentId,
        },
        { state: TournamentStatus.IN_PROGRESS },
      );
    });
  }

  private registrationsToParticipants(
    registrations: TournamentRegistrationEntity[],
    teamSize: number,
  ) {
    const participations: {
      teamId?: string;
      players: string[];
    }[] = [];

    // Fill full
    participations.push(
      ...registrations
        .filter(t => t.players.length === teamSize)
        .map(it => ({
          teamId: it.teamId,
          players: it.players.map(t => t.steamId),
        })),
    );

    // Merge partial
    const partials = registrations.filter(t => t.players.length < teamSize);
    const { teams, leftovers } = this.mergePartials(partials);

    for (let team of teams) {
      participations.push({
        players: team,
      });
    }

    return participations;
  }

  private mergePartials(
    partials: TournamentRegistrationEntity[],
  ): { teams: string[][]; leftovers: string[] } {
    const { teams, leftovers } = minimizeLeftovers(
      partials.map(t => t.players.map(p => p.steamId)),
      5,
    );
    return {
      teams,
      leftovers,
    };
  }
}
