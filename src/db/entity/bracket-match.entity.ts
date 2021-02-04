import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Status as MatchStatus, ParticipantResult } from 'brackets-model';


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
  status: MatchStatus; // todo


  @Column({ type: 'simple-json', nullable: true })
  opponent1: ParticipantResult


  @Column({ type: 'simple-json', nullable: true})
  opponent2: ParticipantResult
}
