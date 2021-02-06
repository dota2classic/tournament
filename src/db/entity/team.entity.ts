import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TeamMemberEntity } from './team-member.entity';
import { BracketParticipantEntity } from './bracket-participant.entity';

@Entity()
export class TeamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creator: string;

  @Column()
  name: string;

  @Column()
  tag: string;

  @Column()
  imageUrl: string;

  @OneToMany(
    () => TeamMemberEntity,
    t => t.team,
  )
  members: TeamMemberEntity[];

}
