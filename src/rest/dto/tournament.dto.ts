import {
  BracketEntryType, BracketType,
  TournamentStatus,
} from '../../gateway/shared-types/tournament';
import { TeamDto } from './team.dto';

export class CreateTournamentDto {
  name: string;
  entryType: BracketEntryType;
  startDate: number;
  imageUrl: string;
  strategy: BracketType
}

export class TournamentParticipantDto {
  public readonly steam_id?: string;
  public readonly team?: TeamDto
}
export class TournamentDto {
  id: number;
  name: string;
  entryType: BracketEntryType;
  status: TournamentStatus;
  startDate: number;
  imageUrl: string;
}
export class FullTournamentDto {
  id: number;
  name: string;
  entryType: BracketEntryType;
  status: TournamentStatus;
  startDate: number;
  imageUrl: string;
  participants: TournamentParticipantDto[]
}

export class SeedItemDto {
  steam_id?: string;
  result?: string;
  team?: TeamDto
  tbd?: boolean
}

export class SeedDto {
  teams: SeedItemDto[];
  date: string;
  matchId?: number;
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
