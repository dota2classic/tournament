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

  @Column({ type: 'simple-json', nullable: true })
  opponent1?: ParticipantResult


  @Column({ type: 'simple-json', nullable: true})
  opponent2?: ParticipantResult


  stage?: StageEntity
}
