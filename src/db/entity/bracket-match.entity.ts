import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Status, ParticipantResult } from 'brackets-model';
import { StageEntity } from './stage.entity';


@Entity()
export class BracketMatchEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  stage_id: number;

  @Column()
  group_id: number;

  @Column()
  round_id: number;

  @Column()
  child_count: number;

  @Column()
  number: number;

  @Column()
  status: Status; // todo wtf?

  @Column({ nullable: true })
  scheduledDate: Date

  /**
   * d2c match id which will be assigned
   */
  @Column({ nullable: true })
  externalMatchId: number;

  /**
   * It is random offset(1/0) which is used to determine teams of opponents
   * This also guarantees we know which opponent is radiant/dire
   */
  @Column({ default: 0})
  teamOffset: number


  @Column({ type: 'simple-json', nullable: true })
  opponent1?: ParticipantResult


  @Column({ type: 'simple-json', nullable: true})
  opponent2?: ParticipantResult


  stage?: StageEntity
}
