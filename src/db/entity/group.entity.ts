import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class GroupEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  stage_id: number;

  @Column()
  number: number


}
