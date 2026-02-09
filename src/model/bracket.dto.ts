import { TeamDto } from './team.dto';
import { Result, Status } from 'brackets-model';
import { ApiProperty } from '@nestjs/swagger';
import { Status as MatchStatus } from 'brackets-model/dist/other';
import { StageType } from 'brackets-model/dist/unions';
import { ParticipantEntity } from '../db/entity/participant.entity';

export class TournamentBracketInfoDto {
  participant: BracketParticipantDto[];
  stage: StageDto[];
  group: GroupDto[];
  round: RoundDto[];
  match: BracketMatchDto[];
}

export class RoundDto {
  id: number;
  stage_id: number;
  group_id: number;
  number: number;
}

export class GroupDto {
  id: number;
  stage_id: number;
  number: number;
}

export class StageDto {
  id: number;
  tournament_id: number;
  name: string;
  type: StageType;
  settings: object;
  number: number;
}

export class BracketMatchDto {
  id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  child_count: number;
  number: number;
  @ApiProperty({ enum: MatchStatus, enumName: 'MatchStatus' })
  status: Status;
  opponent1?: ParticipantResultDto;
  opponent2?: ParticipantResultDto;
  startDate: Date;
  games: BracketMatchGameDto[];
}

export class ParticipantResultDto {
  /** If `null`, the participant is to be determined. */
  id?: number;
  /** Indicates where the participant comes from. */
  position?: number;
  /** If this participant forfeits, the other automatically wins. */
  forfeit?: boolean;
  /** The current score of the participant. */
  score?: number;
  /** Tells what is the result of a duel for this participant. */
  result?: Result;

  tbd?: boolean;

  participant?: BracketParticipantDto;
}

export class BracketMatchGameDto {
  id: string;
  bracket_match_id: number;
  number: number;
  externalMatchId?: number;
  teamOffset: number;
  @ApiProperty({ enum: MatchStatus, enumName: 'MatchStatus' })
  status: MatchStatus;
  finished: boolean;
  scheduledDate: Date;

  opponent1?: ParticipantResultDto;
  opponent2?: ParticipantResultDto;
}

export class OpponentDto {
  id?: number;
  position?: number;
  result?: Result;
  participant?: BracketParticipantDto;
}

export class BracketParticipantDto {
  id: number;
  tournament_id: number;
  team?: TeamDto;
  players?: string[];
}

export class StageRankStandingDto {
  participant: ParticipantEntity;
  rank: number;
}

export class StageStandingsDto {
  stage_id: number;
  name: string;
  standings: StageRankStandingDto[];
}

export class StageStandingsResultRankDto {
  participant: BracketParticipantDto;
  rank: number;
}

export class StageStandingsResultDto {
  stage_id: number;
  name: string;
  standings: StageStandingsResultRankDto[];
}
