import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BracketEntryType } from '../../rest/tournament/bracket.service';

@Entity()
export class TournamentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entryType: BracketEntryType;

  @Column()
  name: string;

}
