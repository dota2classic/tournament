import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BracketParticipantEntity } from './bracket-participant.entity';

/**
 * @entity BracketParticipantPlayerEntity
 *
 * Сущность, описывающая **участие конкретного игрока** на турнире
 *
 * Один игрок (по Steam ID) связан с конкретным участием
 */
@Entity('bracket_participant_player')
export class BracketParticipantPlayerEntity {
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
    name: 'bracket_participant_id',
  })
  bracketParticipantId: number;

  /**
   * Регистрация, к которой привязан игрок.
   *
   * Связь «многие к одному» с {@link BracketParticipantEntity}.
   */
  @ManyToOne(
    () => BracketParticipantEntity,
    t => t.players,
  )
  @JoinColumn({ name: 'bracket_participant_id' })
  bracketParticipation?: BracketParticipantEntity;

  constructor(bracketParticipantId: number, steamId: string) {
    this.steamId = steamId;
    this.bracketParticipantId = bracketParticipantId;
  }
}
