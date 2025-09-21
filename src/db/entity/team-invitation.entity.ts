import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TeamEntity } from './team.entity';

@Entity('team_invitation')
export class TeamInvitationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: string;

  @Column()
  steam_id: string;


  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: "teamId"})
  team: TeamEntity;
}
