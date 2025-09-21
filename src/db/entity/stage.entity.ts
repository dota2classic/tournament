import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { StageSettings, StageType } from 'brackets-model';

@Entity('tournament_stage')
export class StageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tournament_id: number;

  @Column()
  name: string;

  @Column()
  type: StageType;

  @Column()
  number: number


  @Column({ type: 'simple-json'})
  settings: StageSettings
}
