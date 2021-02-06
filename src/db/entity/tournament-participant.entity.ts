import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TournamentEntity } from './tournament.entity';

@Entity()
export class TournamentParticipantEntity {

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

}
