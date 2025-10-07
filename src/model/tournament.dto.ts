import {
  BracketType,
  TournamentStatus,
} from '../gateway/shared-types/tournament';
import { TeamDto } from './team.dto';
import { Dota2Version } from '../gateway/shared-types/dota2version';

export enum TournamentState {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  REGISTRATION = 'REGISTRATION',
  READY_CHECK = 'READY_CHECK',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

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
   * Это значит, что каждому игроку в регистрации нужно подтвердить участие
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


export class CreateTournamentDto {
  name: string;
  startDate: number;
  imageUrl: string;
  strategy: BracketType;
  version: Dota2Version;
  roundBestOf: number;
  finalBestOf: number;
  grandFinalBestOf: number;
}

export class TournamentParticipantDto {
  public readonly players: string[]
  public readonly team?: TeamDto;
}

export class TournamentDto {
  id: number;
  name: string;
  entryType: BracketEntryType;
  status: TournamentStatus;
  version: Dota2Version;
  startDate: number;
  imageUrl: string;
  description: string;
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
  version: Dota2Version;
  startDate: number;
  imageUrl: string;
  participants: TournamentParticipantDto[];
  standings?: TournamentStandingDto[];
  description: string;
}

export class SeedItemDto {
  steam_id?: string;
  result?: string;
  team?: TeamDto;
  tbd?: boolean;
  score?: number;
}

export class MatchGameDto {
  gameId: number;
  bracketMatchId: number;
  externalMatchId?: number;
  scheduledDate?: number;
  teamOffset: number;
  number: number;
}

export class SeedDto {
  teams: SeedItemDto[];
  games: MatchGameDto[];
  id: number;
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

export enum MatchStatus {
  /** The two matches leading to this one are not completed yet. */
  Locked = 'Locked',
  /** One participant is ready and waiting for the other one. */
  Waiting = 'Waiting',
  /** Both participants are ready to start. */
  Ready = 'Ready',
  /** The match is running. */
  Running = 'Running',
  /** The match is completed. */
  Completed = 'Completed',
  /** At least one participant completed his following match. */
  Archived = 'Archived',
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

export class SetMatchResultDto {
  gameId: number;
  winnerId: string;
}
