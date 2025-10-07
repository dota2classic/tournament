import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TournamentEntity } from './tournament.entity';
import { TournamentRegistrationEntity } from './tournament-registration.entity';

@Entity('tournament_registration_player')
export class TournamentRegistrationPlayerEntity {
  @PrimaryColumn({
    name: 'steam_id',
  })
  steamId: string;

  @PrimaryColumn({
    name: 'tournament_registration_id',
  })
  tournamentRegistrationId: number;

  @ManyToOne(
    () => TournamentRegistrationEntity,
    t => t.players,
  )
  @JoinColumn({ name: 'tournamentRegistrationId' })
  registration?: TournamentEntity;
}
