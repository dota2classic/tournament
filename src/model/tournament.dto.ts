import {
  BracketType,
  TournamentStatus,
} from '../gateway/shared-types/tournament';
import { TeamDto } from './team.dto';
import { Result as OpponentResult } from 'brackets-model/dist/unions';
import { Status as MatchStatus } from 'brackets-model';

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
  startDate: Date;
  imageUrl: string;
  strategy: BracketType;
  roundBestOf: number;
  finalBestOf: number;
  grandFinalBestOf: number;
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
  state: TournamentRegistrationState;
}
export class RegistrationDto {
  id: number;
  players: RegistrationPlayerDto[];
  state: TournamentRegistrationState;
}

export class TournamentDto {
  id: number;
  name: string;
  status: TournamentStatus;
  startDate: Date;
  imageUrl: string;
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
  gameId: number;
  bracketMatchId: number;
  externalMatchId?: number;
  scheduledDate?: Date;
  teamOffset: number;
  number: number;
  status: MatchStatus
  opponent1?: SeedItemDto;
  opponent2?: SeedItemDto;
}

export class SeedDto {
  teams: SeedItemDto[];
  games: MatchGameDto[];
  status: MatchStatus
  id: number;
  ch: number;
}

export class BracketRoundDto {
  title: string;
  round: number;
  seeds: SeedDto[];
}

export class BracketDto {
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
  public readonly status: MatchStatus
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

export class SetMatchResultDto {
  gameId: number;
  winnerId: string;
}
