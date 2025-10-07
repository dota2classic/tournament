import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TournamentStatus } from '../gateway/shared-types/tournament';
import { TournamentRegistrationState } from '../model/tournament.dto';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { typeormBulkUpdate } from '../util/typeorm-bulk-update';

@Injectable()
export class TournamentService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
  ) {}

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
        if (player.state === TournamentRegistrationState.PENDING_CONFIRMATION) {
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

      let parameters: unknown[] = players.flatMap(plr => [
        plr.steamId,
        plr.tournamentRegistrationId,
        plr.state,
      ]);

      let placeholder = typeormBulkUpdate(parameters);

      // Bulk update players
      await tx.query(
        `
        UPDATE tournament_registration_player AS trp
SET state = c.state
FROM (VALUES
    ${placeholder}
) AS c(steam_id, tournament_registration_id, state)
WHERE c.steam_id = trp.steam_id
  AND c.tournament_registration_id = trp.tournament_registration_id;
      `,
        parameters,
      );

      parameters = updatedRegistrations.map(reg => [reg.id, reg.state]);
      placeholder = typeormBulkUpdate(parameters);

      // Bulk update players
      await tx.query(
        `
        UPDATE tournament_registration AS tr
SET state = c.state
FROM (VALUES
    ${placeholder}
) AS c(id, state)
WHERE c.id = tr.id;
      `,
        parameters,
      );
    });
  }
}
