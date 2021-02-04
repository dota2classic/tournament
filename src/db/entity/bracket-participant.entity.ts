import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

}
