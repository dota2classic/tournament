import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TeamEntity } from './team.entity';

@Entity()
export class TeamMemberEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  steam_id: string;


  @ManyToOne(() => TeamEntity, t => t.members)
  team: TeamEntity
}
