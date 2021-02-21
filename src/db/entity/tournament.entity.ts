import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BracketEntryType, BracketType, TournamentStatus } from '../../gateway/shared-types/tournament';
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

  @Column({ default: '' })
  description: string;

  @Column()
  imageUrl: string;

  @CreateDateColumn()
  created_at: Date;

  @Column()
  startDate: Date;

  @Column({
    type: 'simple-json',
    default: { round: 1, final: 1, grandFinal: 1 },
  })
  bestOfConfig: BestOfStrategy;

  @OneToMany(
    e => BracketParticipantEntity,
    e => e.tournament,
    { eager: false },
  )
  participants: BracketParticipantEntity[];

  @OneToMany(
    e => TournamentParticipantEntity,
    e => e.tournament,
    { eager: false },
  )
  preParticipants: TournamentParticipantEntity[];
}

export interface BestOfStrategy {
  round: number;
  final: number;
  grandFinal: number;
}
