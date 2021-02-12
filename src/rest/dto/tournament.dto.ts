import { BracketEntryType, BracketType, TournamentStatus } from '../../gateway/shared-types/tournament';
import { TeamDto } from './team.dto';
import { BracketParticipantEntity } from '../../db/entity/bracket-participant.entity';
import { StageEntity } from '../../db/entity/stage.entity';
import { GroupEntity } from '../../db/entity/group.entity';
import { RoundEntity } from '../../db/entity/round.entity';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';

export class CreateTournamentDto {
  name: string;
  entryType: BracketEntryType;
  startDate: number;
  imageUrl: string;
  strategy: BracketType;
}

export class TournamentParticipantDto {
  public readonly steam_id?: string;
  public readonly team?: TeamDto;
}

export class TournamentDto {
  id: number;
  name: string;
  entryType: BracketEntryType;
  status: TournamentStatus;
  startDate: number;
  imageUrl: string;
}

export class TournamentStandingDto {
  steam_id?: string;
  team?: TeamDto;
  position: number;
}

export class FullTournamentDto {
  id: number;
  name: string;
  entryType: BracketEntryType;
  status: TournamentStatus;
  startDate: number;
  imageUrl: string;
  participants: TournamentParticipantDto[];
  standings?: TournamentStandingDto[];
}

export class SeedItemDto {
  steam_id?: string;
  result?: string;
  team?: TeamDto;
  tbd?: boolean;
  score?: number
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
  id: number;

  stage_id: number;

  group_id: number;

  round_id: number;

  child_count: number;

  number: number;

  games: MatchGameDto[]

  status: MatchStatus; // todo wtf?

  opponent1?: SeedItemDto;

  opponent2?: SeedItemDto;
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

