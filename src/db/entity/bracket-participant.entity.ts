import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne, OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { TournamentEntity } from './tournament.entity';
import { TeamEntity } from './team.entity';
import { UUID } from '../../types';
import { TournamentRegistrationPlayerEntity } from './tournament-registration-player.entity';
import { BracketParticipantPlayerEntity } from './bracket-participant-player.entity';

@Entity('bracket_participant')
export class BracketParticipantEntity {
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
  @JoinColumn({ name: 'teamId' })
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
  @JoinColumn({ name: 'tournamentId' })
  tournament: Relation<TournamentEntity>;

  /**
   * Идентификатор турнира
   */
  @Column({ name: 'tournamentId' })
  tournamentId: number;

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
    () => BracketParticipantPlayerEntity,
    t => t.bracketParticipation,
    { eager: true },
  )
  players: Relation<BracketParticipantPlayerEntity>[];

}
