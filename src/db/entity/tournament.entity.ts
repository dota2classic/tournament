import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import {
  BracketType,
  TournamentStatus,
} from '../../gateway/shared-types/tournament';
import { BracketParticipantEntity } from './bracket-participant.entity';
import { TournamentRegistrationEntity } from './tournament-registration.entity';
import { Dota2Version } from '../../gateway/shared-types/dota2version';
import { TournamentState } from '../../model/tournament.dto';

@Entity('tournament')
export class TournamentEntity {
  @PrimaryGeneratedColumn()
  id: number;


  @Column({
    name: 'state',
    default: TournamentState.DRAFT,
    enum: true,
    enumName: 'tournament_state',
  })
  state: TournamentState;

  @Column({
    name: 'team_size',
    type: 'smallint',
  })
  teamSize: number;

  @Column()
  name: string;

  @Column({ default: Dota2Version.Dota_684 })
  version: Dota2Version;

  @Column({ default: TournamentStatus.NEW })
  status: TournamentStatus;

  @Column()
  strategy: BracketType;

  @Column({ default: '' })
  description: string;

  @Column()
  imageUrl: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({
    name: 'start_date',
  })
  startDate: Date;

  @Column({
    type: 'simple-json',
    default: { round: 1, final: 1, grandFinal: 1 },
  })
  bestOfConfig: BestOfStrategy;

  @OneToMany(
    e => BracketParticipantEntity,
    e => e.tournament,
    { eager: false },
  )
  participants: BracketParticipantEntity[];

  @OneToMany(
    e => TournamentRegistrationEntity,
    e => e.tournament,
    { eager: false },
  )
  preParticipants: TournamentRegistrationEntity[];
}

export interface BestOfStrategy {
  round: number;
  final: number;
  grandFinal: number;
}
