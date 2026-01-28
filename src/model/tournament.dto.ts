import { BracketType, TournamentStatus } from '../gateway/shared-types/tournament';
import { TeamDto } from './team.dto';
import { Result as OpponentResult } from 'brackets-model/dist/unions';
import { Status as MatchStatus } from 'brackets-model';
import { ApiProperty } from '@nestjs/swagger';
import { BestOfStrategy } from '../db/entity/tournament.entity';

/**
 * Состояние регистрации на турнир.
 *
 * Отражает этап жизненного цикла заявки — от создания до подтверждения или отклонения.
 */
export enum TournamentRegistrationState {
  /**
   * Регистрация создана, но ещё не начала процесс подтверждения.
   * Например, игрок или команда только подали заявку.
   */
  CREATED = 'CREATED',

  /**
   * Регистрация ожидается подтверждения.
   * Это значит, что каждому игроку в регистрации нужно подтвердить участие, иначе он/его группа не станут участниками
   */
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',

  /**
   * Регистрация подтверждена — игрок или команда официально допущены к участию.
   */
  CONFIRMED = 'CONFIRMED',

  /**
   * Подтверждение отклонено игроком
   */
  DECLINED = 'DECLINED',

  /**
   * Регистрация автоматически отклонена из-за превышения времени ожидания.
   * Используется, если заявка не была подтверждена в установленный срок.
   */
  TIMED_OUT = 'TIMED_OUT',
}

export class RegisterAsPartyDto {
  steamIds: string[];
}

export class ConfirmRegistrationDto {
  steamId: string;
  confirm: boolean;
}

export class CreateTournamentDto {
  name: string;
  teamSize: number;
  description: string;
  startDate: string;
  imageUrl: string;

  @ApiProperty({ enum: BracketType, enumName: 'BracketType' })
  strategy: BracketType;
  roundBestOf: number;
  finalBestOf: number;
  grandFinalBestOf: number;
}

export class UpdateTournamentDto {
  name?: string;
  description?: string;

  teamSize?: number;
  startDate?: string;
  imageUrl?: string;

  @ApiProperty({ enum: BracketType, enumName: 'BracketType' })
  strategy?: BracketType;
  roundBestOf?: number;
  finalBestOf?: number;
  grandFinalBestOf?: number;
}

export class UpdateTournamentStatusDto {
  status: TournamentStatus;
}

export class TournamentParticipantDto {
  public readonly players: string[];
  public readonly team?: TeamDto;
}

export class RegistrationPlayerDto {
  steamId: string;
  @ApiProperty({
    enum: TournamentRegistrationState,
    enumName: 'TournamentRegistrationState',
  })
  state: TournamentRegistrationState;
}
export class RegistrationDto {
  id: number;
  players: RegistrationPlayerDto[];
  @ApiProperty({
    enum: TournamentRegistrationState,
    enumName: 'TournamentRegistrationState',
  })
  state: TournamentRegistrationState;
}

export class TournamentDto {
  id: number;
  name: string;
  imageUrl: string;

  teamSize: number;

  @ApiProperty({ enum: TournamentStatus, enumName: 'TournamentStatus' })
  status: TournamentStatus;

  @ApiProperty({ enum: BracketType, enumName: 'BracketType' })
  strategy: BracketType;

  bestOfStrategy: BestOfStrategy;

  startDate: string;
  description: string;
  registrations: RegistrationDto[];
}

export class TournamentStandingDto {
  steam_id?: string;
  team?: TeamDto;
  position: string;
}

export class FullTournamentDto {
  id: number;
  name: string;
  @ApiProperty({ enum: TournamentStatus, enumName: 'TournamentStatus' })
  status: TournamentStatus;
  startDate: number;
  imageUrl: string;
  participants: TournamentParticipantDto[];
  standings?: TournamentStandingDto[];
  description: string;
}

export class SeedItemDto {
  id: number;
  result?: OpponentResult;
  team?: TeamDto;
  tbd?: boolean;
  score?: number;

  players: string[];
}

export class MatchGameDto {
  gameId: string;
  bracketMatchId: number;
  externalMatchId?: number;
  scheduledDate?: string;
  teamOffset: number;
  number: number;
  @ApiProperty({ enum: MatchStatus, enumName: 'MatchStatus' })
  status: MatchStatus;
  opponent1?: SeedItemDto;
  opponent2?: SeedItemDto;
}

export class SeedDto {
  teams: SeedItemDto[];
  games: MatchGameDto[];
  @ApiProperty({ enum: MatchStatus, enumName: 'MatchStatus' })
  status: MatchStatus;
  id: number;
  scheduledDate: string;
  number: number;
  ch: number;
}

export class BracketRoundDto {
  title: string;
  round: number;
  seeds: SeedDto[];
}

export class BracketDto {
  @ApiProperty({ enum: BracketType, enumName: 'BracketType' })
  type: BracketType;
  winning: BracketRoundDto[];
  losing: BracketRoundDto[];
}

export class TournamentMatchDto {
  public readonly id: number;
  public readonly stage_id: number;
  public readonly group_id: number;
  public readonly round_id: number;
  public readonly child_count: number;
  public readonly number: number;
  public readonly games: MatchGameDto[];
  public readonly status: MatchStatus;
  public readonly opponent1?: SeedItemDto;
  public readonly opponent2?: SeedItemDto;
}

export class ScheduleTournamentMatchDto {
  gameId: number;
  scheduledDate: number;
}

export class ForfeitDto {
  gameId: number;
  forfeitId: string;
}

export class SetGameWinnerDto {
  gameId: string;
  winnerId: number;
  d2cMatchId?: number;
}

export class StartGameDto {
  gameId: string;
}
