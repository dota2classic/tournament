import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany, OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  BracketEntryType,
  BracketType,
  TournamentStatus,
} from '../../gateway/shared-types/tournament';
import { BracketParticipantEntity } from './bracket-participant.entity';
import { TournamentParticipantEntity } from './tournament-participant.entity';

@Entity()
export class TournamentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entryType: BracketEntryType;

  @Column()
  name: string;

  @Column({ default: TournamentStatus.NEW })
  status: TournamentStatus;

  @Column()
  strategy: BracketType;

  @Column()
  imageUrl: string;

  @CreateDateColumn()
  created_at: Date;

  @Column()
  startDate: Date;

  @OneToMany(
    e => BracketParticipantEntity,
    e => e.tournament,
    { eager: true },
  )
  participants: BracketParticipantEntity[];

  @OneToMany(
    e => TournamentParticipantEntity,
    e => e.tournament,
    { eager: false },
  )
  preParticipants: TournamentParticipantEntity[];
}
