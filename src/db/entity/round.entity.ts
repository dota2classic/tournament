import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Round } from 'brackets-model';

@Entity('tournament_round')
export class RoundEntity implements Round {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number: number;

  @Column({
    type: "int"
  })
  stage_id: number | string;

  @Column()
  group_id: number;
}
