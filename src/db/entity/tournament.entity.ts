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
import { BracketParticipantEntity } from './bracket-participant.entity';
import { TournamentRegistrationEntity } from './tournament-registration.entity';
import { Dota2Version } from '../../gateway/shared-types/dota2version';

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

  @Column({ default: Dota2Version.Dota_684 })
  version: Dota2Version;

  @Column({
    default: TournamentStatus.DRAFT,
    enum: true,
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
  registrations: TournamentRegistrationEntity[];

  constructor(
    teamSize: number,
    name: string,
    version: Dota2Version,
    strategy: BracketType,
    description: string,
    imageUrl: string,
    startDate: Date,
    bestOfConfig: BestOfStrategy,
  ) {
    this.teamSize = teamSize;
    this.name = name;
    this.version = version;
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
