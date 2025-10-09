import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TournamentParticipantEntity } from './tournament-participant.entity';

/**
 * @entity BracketParticipantPlayerEntity
 *
 * Сущность, описывающая **участие конкретного игрока** на турнире
 *
 * Один игрок (по Steam ID) связан с конкретным участием
 */
@Entity('tournament_participant_player')
export class TournamentParticipantPlayerEntity {
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
   * Идентификатор участия, к которому относится данный игрок.
   *
   * Также часть составного первичного ключа.
   */
  @PrimaryColumn({
    name: 'tournament_participant_id',
  })
  tournamentParticipantId: number;

  /**
   * Регистрация, к которой привязан игрок.
   *
   * Связь «многие к одному» с {@link TournamentParticipantEntity}.
   */
  @ManyToOne(
    () => TournamentParticipantEntity,
    t => t.players,
  )
  @JoinColumn({ name: 'tournament_participant_id' })
  tournamentParticipant?: TournamentParticipantEntity;

  constructor(tournamentParticipantId: number, steamId: string) {
    this.steamId = steamId;
    this.tournamentParticipantId = tournamentParticipantId;
  }
}
