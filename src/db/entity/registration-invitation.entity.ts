import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { TournamentEntity } from './tournament.entity';

@Entity('registration_invitation')
export class RegistrationInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'inviter_steam_id',
  })
  inviterSteamId: string;

  @ManyToOne(() => TournamentEntity, (t) => t.invitations)
  @JoinColumn({
    name: 'tournament_id',
  })
  tournament: Relation<TournamentEntity>;

  @Column({
    name: 'tournament_id',
  })
  tournamentId: number;

  @Column({
    name: 'steam_id',
  })
  steamId: string;

  @Column({
    name: 'registration_id',
  })
  registrationId: number;

  constructor(
    inviterSteamId: string,
    steamId: string,
    registrationId: number,
    tournamentId: number,
  ) {
    this.inviterSteamId = inviterSteamId;
    this.steamId = steamId;
    this.registrationId = registrationId;
    this.tournamentId = tournamentId;
  }
}
