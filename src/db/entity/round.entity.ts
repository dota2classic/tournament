import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class RoundEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number: number

  @Column()
  stage_id: number;

  @Column()
  group_id: number
}
