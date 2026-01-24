import { StageEntity } from '../db/entity/stage.entity';
import { GroupEntity } from '../db/entity/group.entity';
import { RoundEntity } from '../db/entity/round.entity';
import { TeamDto } from './team.dto';
import { Result, Status } from 'brackets-model';

export class TournamentBracketInfoDto {
  participant: BracketParticipantDto[];
  stage: StageEntity[];
  group: GroupEntity[];
  round: RoundEntity[];
  match: BracketMatchDto[];
}

export class BracketMatchDto {
  id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  child_count: number;
  number: number;
  status: Status;
  opponent1?: ParticipantResultDto;
  opponent2?: ParticipantResultDto;
  startDate: number;
  games: BracketMatchGameDto[];
}

export class ParticipantResultDto {
  /** If `null`, the participant is to be determined. */
  id: string | number | null;
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
  bm_id: number;
  number: number;
  externalMatchId?: number;
  teamOffset: number;
  finished: boolean;
  scheduledDate: number;
}

export class BracketParticipantDto {
  id: number;
  tournament_id: number;
  steam_id?: string;
  team?: TeamDto;
}
