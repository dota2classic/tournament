import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { Match, ParticipantResult, Status } from 'brackets-model';
import { StageEntity } from './stage.entity';
import { GroupEntity } from './group.entity';
import { RoundEntity } from './round.entity';
import { MatchGameEntity } from './match-game.entity';

// Managed by brackets-manager
@Entity('bracket_match')
export class BracketMatchEntity implements Match {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  stage_id: number | string;

  @Column()
  group_id: number;

  @Column()
  round_id: number;

  @Column()
  child_count: number;

  @Column()
  number: number;

  @Column()
  status: Status;

  @Column({ nullable: true, type: 'timestamptz' })
  scheduledDate: Date;

  @Column({ type: 'simple-json', nullable: true })
  opponent1: ParticipantResult | null;

  @Column({ type: 'simple-json', nullable: true })
  opponent2: ParticipantResult | null;

  stage?: StageEntity;

  @ManyToOne(() => GroupEntity)
  @JoinColumn({ name: 'group_id', referencedColumnName: 'id' })
  group?: GroupEntity;

  @ManyToOne(() => RoundEntity)
  @JoinColumn({ name: 'round_id', referencedColumnName: 'id' })
  round?: RoundEntity;

  @OneToMany(
    () => MatchGameEntity,
    t => t.match,
  )
  games: Relation<MatchGameEntity>[];
}
