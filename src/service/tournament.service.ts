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
import { DataSource, Repository } from 'typeorm';
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

@Injectable()
export class TournamentService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
  ) {}

  /**
   * Завершает регистрацию на турнир и меняет статус
   * @param tournamentId
   */
  public async finishRegistration(tournamentId: number) {
    const tournament = await this.getFullTournament(tournamentId);

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    if (tournament.state !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException(
        `Tournament must be in "registration" state!`,
      );
    }

    await this.tournamentEntityRepository.update(
      {
        id: tournamentId,
      },
      { state: TournamentStatus.IN_PROGRESS },
    );
  }

  /**
   * Создает сущность турнира
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

    return this.tournamentEntityRepository.save(
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
  }

  /**
   * Завершает проверку на готовность и выставляет актуальные статусы для зарегистрированных
   * @param tournamentId
   */
  public async finishReadyCheck(tournamentId: number) {
    const tournament = await this.getFullTournament(tournamentId);
    if (tournament.state !== TournamentStatus.READY_CHECK) {
      throw new BadRequestException(
        'Tournament must be in ready check state to start',
      );
    }

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
        }
      }

      registration.state = isReady
        ? TournamentRegistrationState.CONFIRMED
        : TournamentRegistrationState.DECLINED;
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
    });
  }

  public async startTournament(tournamentId: number) {
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

  private async getFullTournament(id: number) {
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
