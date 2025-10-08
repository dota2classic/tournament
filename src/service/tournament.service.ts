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
import { Dota2Version } from '../gateway/shared-types/dota2version';

@Injectable()
export class TournamentService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
  ) {}

  /**
   * Завершает регистрацию турнира и выставляет актуальные статусы для зарегистрированных и турнира.
   * @param tournamentId
   */
  public async finishRegistration(tournamentId: number) {
    const tournament = await this.tournamentEntityRepository.findOne({
      where: {
        id: tournamentId,
      },
      relations: ['registrations', 'registrations.players'],
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    if (tournament.state !== TournamentStatus.REGISTRATION) {
      throw new BadRequestException(
        `Tournament must be in "registration" state!`,
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
      // Update tournament status
      await tx.update<TournamentEntity>(
        TournamentEntity,
        {
          id: tournamentId,
        },
        { state: TournamentStatus.READY_CHECK },
      );

      const players: TournamentRegistrationPlayerEntity[] = updatedRegistrations.flatMap(
        t => t.players,
      );
      if (players.length > 0) {
        const batches: unknown[][] = players.map(plr => [
          plr.steamId,
          plr.tournamentRegistrationId,
          plr.state,
        ]);
        const [parameters, placeholder] = typeormBulkUpdate(batches);

        // Bulk update players
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

      if (updatedRegistrations.length > 0) {
        const batches = updatedRegistrations.map(reg => [reg.id, reg.state]);
        const [parameters, placeholder] = typeormBulkUpdate(batches);

        // Bulk update registrations
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
}
