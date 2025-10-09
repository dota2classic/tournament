import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  BracketType,
  TournamentStatus,
} from '../../gateway/shared-types/tournament';
import { TournamentParticipantEntity } from './tournament-participant.entity';
import { TournamentRegistrationEntity } from './tournament-registration.entity';

@Entity('tournament')
export class TournamentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'team_size',
    type: 'smallint',
  })
  teamSize: number;

  @Column()
  name: string;

  @Column({
    default: TournamentStatus.DRAFT,
    type: 'enum',
    enum: TournamentStatus,
    enumName: 'tournament_state',
  })
  state: TournamentStatus;

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
    e => TournamentParticipantEntity,
    e => e.tournament,
    { eager: false },
  )
  participants: TournamentParticipantEntity[];

  @OneToMany(
    e => TournamentRegistrationEntity,
    e => e.tournament,
    { eager: false },
  )
  registrations: TournamentRegistrationEntity[];

  constructor(
    teamSize: number,
    name: string,
    strategy: BracketType,
    description: string,
    imageUrl: string,
    startDate: Date,
    bestOfConfig: BestOfStrategy,
  ) {
    this.teamSize = teamSize;
    this.name = name;
    this.strategy = strategy;
    this.description = description;
    this.imageUrl = imageUrl;
    this.startDate = startDate;
    this.bestOfConfig = bestOfConfig;
  }
}

export interface BestOfStrategy {
  round: number;
  final: number;
  grandFinal: number;
}
