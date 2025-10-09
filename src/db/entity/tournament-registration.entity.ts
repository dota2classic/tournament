import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { TournamentEntity } from './tournament.entity';
import { TournamentRegistrationPlayerEntity } from './tournament-registration-player.entity';
import { TeamEntity } from './team.entity';
import { UUID } from '../../types';
import { TournamentRegistrationState } from '../../model/tournament.dto';

/**
 * @entity TournamentRegistrationEntity
 *
 * Сущность, описывающая **регистрацию на турнир**.
 *
 * Регистрация может представлять:
 * - одного игрока;
 * - неполную команду (группу игроков, не собравшую полный состав);
 * - полную команду.
 *
 * Эта сущность связывает игроков, команду (если есть) и сам турнир.
 */
@Entity('tournament_registration')
export class TournamentRegistrationEntity {
  /**
   * Уникальный идентификатор регистрации.
   */
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Дата и время создания записи.
   *
   * Устанавливается автоматически при создании регистрации.
   * Используется для аудита и отслеживания момента подачи заявки.
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  /**
   * Дата и время последнего обновления записи.
   *
   * Обновляется автоматически при любых изменениях регистрации.
   * Полезно для логирования и контроля изменений состояния.
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;

  /**
   * Список игроков, участвующих в регистрации.
   *
   * Каждый элемент — это связь с `TournamentRegistrationPlayerEntity`,
   * где хранится информация о конкретном игроке в этой регистрации.
   *
   * Eager-загрузка включена, чтобы данные игроков подгружались
   * автоматически при запросе регистрации.
   */
  @OneToMany(
    () => TournamentRegistrationPlayerEntity,
    t => t.registration,
    { eager: true },
  )
  players: Relation<TournamentRegistrationPlayerEntity>[];

  /**
   * Команда, которая регистрируется на турнир.
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
   * Турнир, на который подана регистрация.
   */
  @ManyToOne(
    () => TournamentEntity,
    t => t.participants,
  )
  @JoinColumn({ name: 'tournament_id' })
  tournament?: Relation<TournamentEntity>;

  /**
   * Идентификатор турнира, к которому относится данная регистрация.
   */
  @Column({ name: 'tournament_id' })
  tournamentId: number;

  /**
   * Текущее состояние регистрации.
   *
   * Возможные состояния задаются в перечислении {@link TournamentRegistrationState}.
   */
  @Column({
    name: 'state',
    default: TournamentRegistrationState.CREATED,
    enum: TournamentRegistrationState,
    type: "enum",
    enumName: 'tournament_registration_state',
  })
  state: TournamentRegistrationState;

  constructor(tournamentId: number, teamId?: UUID, state?: TournamentRegistrationState) {
    this.teamId = teamId;
    this.tournamentId = tournamentId;
    this.state = state;
  }
}
