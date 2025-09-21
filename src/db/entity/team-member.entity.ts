import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TeamEntity } from './team.entity';

@Entity('team_member')
export class TeamMemberEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  steam_id: string;

  @Column()
  teamId: string;

  @ManyToOne(() => TeamEntity, t => t.members)
  @JoinColumn({name: "teamId"})
  team: TeamEntity
}
