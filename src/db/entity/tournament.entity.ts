import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import {
  BracketType,
  TournamentStatus,
} from '../../gateway/shared-types/tournament';
import { ParticipantEntity } from './participant.entity';
import { TournamentRegistrationEntity } from './tournament-registration.entity';
import { StageEntity } from './stage.entity';
import { Dota_GameMode } from '../../gateway/shared-types/dota-game-mode';
import { RegistrationInvitationEntity } from './registration-invitation.entity';

export class BestOfStrategy {
  round: number;
  final: number;
  grandFinal: number;
}

export class ScheduleStrategy {
  gameDurationSeconds: number;
  gameBreakDurationSeconds: number;
}

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

  @Column({
    type: 'smallint',
    name: 'game_mode',
    default: Dota_GameMode.CAPTAINS_MODE,
  })
  gameMode: Dota_GameMode;

  @Column()
  strategy: BracketType;

  @Column({ default: '' })
  description: string;

  @Column({
    name: 'image_url',
    default: '',
  })
  imageUrl: string;

  @Column({
    name: 'prize',
    default: '',
  })
  prize: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({
    name: 'start_date',
  })
  startDate: Date;

  @Column({
    type: 'simple-json',
    default: { round: 1, final: 1, grandFinal: 1 },
    name: 'best_of_config',
  })
  bestOfConfig: BestOfStrategy;

  @Column({
    type: 'simple-json',
    name: 'schedule_strategy',
    default: {
      gameBreakDurationSeconds: 60 * 10,
      gameDurationSeconds: 60 * 50,
    } satisfies ScheduleStrategy,
  })
  scheduleStrategy: ScheduleStrategy;

  @OneToMany((e) => ParticipantEntity, (e) => e.tournament, { eager: false })
  participants: Relation<ParticipantEntity>[];

  @OneToMany((e) => RegistrationInvitationEntity, (e) => e.tournament, {
    eager: false,
  })
  invitations: Relation<RegistrationInvitationEntity>[];

  @OneToMany((e) => TournamentRegistrationEntity, (e) => e.tournament, {
    eager: false,
  })
  registrations: Relation<TournamentRegistrationEntity>[];

  @OneToMany((e) => StageEntity, (e) => e.tournament, { eager: false })
  stages: Relation<StageEntity>[];

  constructor(
    teamSize: number,
    name: string,
    strategy: BracketType,
    description: string,
    imageUrl: string,
    prize: string,
    startDate: Date,
    bestOfConfig: BestOfStrategy,
    gameMode: Dota_GameMode,
    scheduleStrategy: ScheduleStrategy,
  ) {
    this.teamSize = teamSize;
    this.name = name;
    this.strategy = strategy;
    this.description = description;
    this.imageUrl = imageUrl;
    this.prize = prize;
    this.startDate = startDate;
    this.bestOfConfig = bestOfConfig;
    this.gameMode = gameMode;
    this.scheduleStrategy = scheduleStrategy;
  }
}
