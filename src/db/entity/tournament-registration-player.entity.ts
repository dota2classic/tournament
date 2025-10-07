import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TournamentRegistrationEntity } from './tournament-registration.entity';
import { TournamentRegistrationState } from '../../model/tournament.dto';

/**
 * @entity TournamentRegistrationPlayerEntity
 *
 * Сущность, описывающая **участие конкретного игрока** в регистрации на турнир.
 *
 * Один игрок (по Steam ID) связан с конкретной регистрацией.
 * Используется как связующая таблица между игроками и регистрацией (один-ко-многим).
 */
@Entity('tournament_registration_player')
export class TournamentRegistrationPlayerEntity {
  /**
   * Уникальный идентификатор игрока в Steam.
   *
   * Используется как часть составного первичного ключа.
   */
  @PrimaryColumn({
    name: 'steam_id',
  })
  steamId: string;

  /**
   * Идентификатор регистрации, к которой относится данный игрок.
   *
   * Также часть составного первичного ключа.
   */
  @PrimaryColumn({
    name: 'tournament_registration_id',
  })
  tournamentRegistrationId: number;

  /**
   * Регистрация, к которой привязан игрок.
   *
   * Связь «многие к одному» с {@link TournamentRegistrationEntity}.
   */
  @ManyToOne(
    () => TournamentRegistrationEntity,
    t => t.players,
  )
  @JoinColumn({ name: 'tournamentRegistrationId' })
  registration?: TournamentRegistrationEntity;

  /**
   * Состояние подтверждения игрока
   *
   * Возможные состояния задаются в перечислении {@link TournamentRegistrationState}.
   */
  @Column({
    name: 'state',
    default: TournamentRegistrationState.CREATED,
    enum: true,
    enumName: 'tournament_registration_state',
  })
  state: TournamentRegistrationState;


  constructor(steamId: string, tournamentRegistrationId: number) {
    this.steamId = steamId;
    this.tournamentRegistrationId = tournamentRegistrationId;
  }
}
