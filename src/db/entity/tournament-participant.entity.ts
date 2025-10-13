import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { TournamentEntity } from './tournament.entity';
import { TeamEntity } from './team.entity';
import { UUID } from '../../types';
import { TournamentParticipantPlayerEntity } from './tournament-participant-player.entity';
import { Participant } from 'brackets-model';

@Entity('tournament_participant')
export class TournamentParticipantEntity implements Omit<Participant, "name"> {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Команда, которая принимает участие в турнире
   *
   * Может быть `null`, если регистрация идёт не от команды, а от
   * индивидуального игрока или временной группы.
   */
  @ManyToOne(
    () => TeamEntity,
    t => t.participations,
    { nullable: true },
  )
  @JoinColumn({ name: 'team_id' })
  team?: Relation<TeamEntity>;

  /**
   * Идентификатор команды (если она указана).
   *
   * UUID, может быть `null` для одиночных регистраций.
   */
  @Column({
    name: 'team_id',
    nullable: true,
    type: 'uuid',
  })
  teamId?: UUID;

  /**
   * Турнир
   */
  @ManyToOne(
    () => TournamentEntity,
    t => t.participants,
  )
  @JoinColumn({ name: 'tournament_id' })
  tournament: Relation<TournamentEntity>;

  /**
   * Идентификатор турнира
   */
  @Column({ name: 'tournament_id' })
  tournament_id: number;

  /**
   * Список игроков участвующих.
   *
   * Каждый элемент — это связь с `TournamentRegistrationPlayerEntity`,
   * где хранится информация о конкретном игроке в этой регистрации.
   *
   * Eager-загрузка включена, чтобы данные игроков подгружались
   * автоматически при запросе регистрации.
   */
  @OneToMany(
    () => TournamentParticipantPlayerEntity,
    t => t.tournamentParticipant,
    { eager: true },
  )
  players: Relation<TournamentParticipantPlayerEntity>[];

  constructor(tournamentId: number, teamId?: UUID) {
    this.teamId = teamId;
    this.tournament_id = tournamentId;
  }
}
