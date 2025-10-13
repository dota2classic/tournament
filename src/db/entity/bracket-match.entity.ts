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
import { BracketMatchGameEntity } from './bracket-match-game.entity';

// Managed by brackets-manager
@Entity('tournament_bracket_match')
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

  @Column({
    name: 'status',
    default: Status.Locked,
    type: "enum",
    enum: Status,
    enumName: 'tournament_match_status',
  })
  status: Status;

  @Column({ nullable: true, type: 'timestamptz' })
  scheduledDate: Date;

  @Column({ type: 'simple-json', nullable: true })
  opponent1: ParticipantResult | null;

  @Column({ type: 'simple-json', nullable: true })
  opponent2: ParticipantResult | null;

  @ManyToOne(() => StageEntity, t => t.matches)
  @JoinColumn({ name: 'stage_id', referencedColumnName: 'id' })
  stage?: StageEntity;

  @ManyToOne(() => GroupEntity)
  @JoinColumn({ name: 'group_id', referencedColumnName: 'id' })
  group?: GroupEntity;

  @ManyToOne(() => RoundEntity)
  @JoinColumn({ name: 'round_id', referencedColumnName: 'id' })
  round?: RoundEntity;

  @OneToMany(
    () => BracketMatchGameEntity,
    t => t.match,
  )
  games: Relation<BracketMatchGameEntity>[];
}
