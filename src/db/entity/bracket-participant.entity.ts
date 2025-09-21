import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TournamentEntity } from './tournament.entity';
import { TeamEntity } from './team.entity';

@Entity('bracket_participant')
export class BracketParticipantEntity {
  @PrimaryGeneratedColumn()
  id: number;


  /**
   * This is external id, be it teamID or playerID
   */
  @Column()
  name: string;

  @ManyToOne(
    () => TournamentEntity,
    t => t.participants,
  )
  @JoinColumn({ name: 'tournament_id' })
  tournament?: TournamentEntity;


  @Column()
  tournament_id: number;

  team?: TeamEntity;
}
