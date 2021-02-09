import {
  BracketEntryType,
  BracketType,
  TournamentStatus,
} from '../../gateway/shared-types/tournament';
import { TeamDto } from './team.dto';

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
  // standings: SeedItemDto
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
}

export class SeedItemDto {
  steam_id?: string;
  result?: string;
  team?: TeamDto;
  tbd?: boolean;
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

  status: MatchStatus; // todo wtf?

  scheduledDate: number;

  /**
   * d2c match id which will be assigned
   */
  externalMatchId: number;

  /**
   * It is random offset(1/0) which is used to determine teams of opponents
   * This also guarantees we know which opponent is radiant/dire
   */
  teamOffset: number;

  opponent1?: SeedItemDto;

  opponent2?: SeedItemDto;

}




export class ScheduleTournamentMatchDto {
  scheduledDate: number
}

export class ForfeitDto {
  forfeitId: string
}

export class SetMatchResultDto {
  winnerId: string;
}
