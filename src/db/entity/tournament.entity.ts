import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BracketEntryType, TournamentStatus } from '../../gateway/shared-types/tournament';

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


  @CreateDateColumn()
  created_at: Date


  @Column()
  startDate: Date
}
