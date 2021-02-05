import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TeamInvitationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: string;

  @Column()
  steam_id: string;
}
