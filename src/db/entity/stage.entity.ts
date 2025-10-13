import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne, OneToMany,
  PrimaryGeneratedColumn, Relation,
} from 'typeorm';
import { Stage, StageSettings, StageType } from 'brackets-model';
import { TournamentEntity } from './tournament.entity';
import { BracketMatchEntity } from './bracket-match.entity';

@Entity('tournament_stage')
export class StageEntity implements Stage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => TournamentEntity,
    t => t.stages,
  )
  @JoinColumn({ name: 'tournament_id' })
  tournament: TournamentEntity;

  @Column()
  tournament_id: number;

  @Column()
  name: string;

  @Column()
  type: StageType;

  @Column()
  number: number;

  @Column({ type: 'simple-json' })
  settings: StageSettings;

  @OneToMany(
    e => BracketMatchEntity,
    e => e.stage,
    { eager: false },
  )
  matches: Relation<BracketMatchEntity>[];
}
