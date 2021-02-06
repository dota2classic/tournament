import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TournamentEntity } from './tournament.entity';
import { TeamEntity } from './team.entity';

@Entity()
export class BracketParticipantEntity {

  @PrimaryGeneratedColumn()
  id: number;


  @Column()
  tournament_id: number;


  /**
   * This is external id, be it teamID or playerID
   */
  @Column()
  name: string;



  @ManyToOne(t => TournamentEntity, t => t.participants)
  @JoinColumn({ name: 'tournament_id'})
  tournament?: TournamentEntity

  team?: TeamEntity

}
