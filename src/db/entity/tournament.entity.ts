import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BracketEntryType, BracketType, TournamentStatus } from '../../gateway/shared-types/tournament';

@Entity()
export class TournamentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entryType: BracketEntryType;

  @Column()
  name: string;


  @Column({ default: TournamentStatus.NEW })
  status: TournamentStatus;

  @Column()
  strategy: BracketType;


  @Column()
  imageUrl: string

  @CreateDateColumn()
  created_at: Date


  @Column()
  startDate: Date
}
