import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MatchGameEntity {
  @PrimaryGeneratedColumn()
  id: number;

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
  number: number


  /**
   * Dota2classic match attached or not
   */
  @Column({ nullable: true })
  externalMatchId?: number


  @Column({ default: 0})
  teamOffset: number


  @Column({ default: false })
  finished: boolean

  @Column({ nullable: true })
  scheduledDate: Date
  /**
   * Participant id of the winner
   */
  @Column({ nullable: true })
  winner?: number

  /**
   * Participant id of the loser
   */
  @Column({ nullable: true })
  loser?: number
}
