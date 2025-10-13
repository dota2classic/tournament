import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BracketMatchEntity } from './bracket-match.entity';
import { MatchGame, ParticipantResult, Status } from 'brackets-model';

@Entity('tournament_bracket_match_game')
export class BracketMatchGameEntity implements MatchGame {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Number of the match
   * BO1 = 1
   * BO3 = 1,2,3
   */
  @Column()
  number: number;

  /**
   * Dota2classic match attached or not
   */
  @Column({ nullable: true })
  externalMatchId?: number;

  /**
   * It is random offset(1/0) which is used to determine radiant/dire
   */
  @Column({ default: 0 })
  teamOffset: number;

  @Column({ default: false })
  finished: boolean;

  @Column({ nullable: true })
  scheduledDate: Date;

  @Column({
    nullable: true,
    type: 'jsonb',
    default: null,
  })
  opponent1: ParticipantResult | null;

  @Column({
    nullable: true,
    type: 'jsonb',
    default: null,
  })
  opponent2: ParticipantResult | null;

  @ManyToOne(
    () => BracketMatchEntity,
    t => t.games,
  )
  @JoinColumn({ name: 'parent_id' })
  match: BracketMatchEntity;

  @Column()
  parent_id: number;

  @Column()
  stage_id: number;

  @Column({
    name: 'status',
    default: Status.Locked,
    type: 'enum',
    enum: Status,
    enumName: 'tournament_match_status',
  })
  status: Status;

  constructor(parentId: number, number: number) {
    this.parent_id = parentId;
    this.number = number;
  }
}
