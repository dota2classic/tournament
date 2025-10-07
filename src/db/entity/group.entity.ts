import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Group } from 'brackets-model';

@Entity('tournament_group')
export class GroupEntity implements Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  stage_id: number;

  @Column()
  number: number;
}
