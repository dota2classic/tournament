import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BracketEntryType } from '../../gateway/shared-types/tournament';

@Entity()
export class TournamentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entryType: BracketEntryType;

  @Column()
  name: string;

}
