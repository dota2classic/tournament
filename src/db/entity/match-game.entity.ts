import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { BracketMatchEntity } from './bracket-match.entity';

@Entity('tournament_match_game')
export class MatchGameEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => BracketMatchEntity,
    t => t.games,
  )
  @JoinColumn({ name: 'bm_id' })
  match: Relation<BracketMatchEntity>;

  /**
   * Bracket match
   */
  @Column()
  bm_id: number;

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
   * It is random offset(1/0) which is used to determine teams of opponents
   * This also guarantees we know which opponent is radiant/dire
   */
  @Column({ default: 0 })
  teamOffset: number;

  @Column({ default: false })
  finished: boolean;

  @Column({ nullable: true })
  scheduledDate: Date;
  /**
   * Participant id of the winner
   */
  @Column({ nullable: true })
  winner?: number;

  /**
   * Participant id of the loser
   */
  @Column({ nullable: true })
  loser?: number;

  constructor(bm_id: number, number: number) {
    this.bm_id = bm_id;
    this.number = number;
  }
}
