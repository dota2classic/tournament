import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TeamMemberEntity } from './team-member.entity';

@Entity()
export class TeamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creator: string;

  @OneToMany(
    () => TeamMemberEntity,
    t => t.team,
  )
  members: TeamMemberEntity[];
}
