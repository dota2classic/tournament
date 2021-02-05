import { BracketEntryType, TournamentStatus } from '../../gateway/shared-types/tournament';
import { EntryIdType } from '../tournament/bracket.service';

export class CreateTournamentDto {
  name: string;
  entryType: BracketEntryType;
  startDate: number;
}


export class TournamentDto {
  id: number;
  name: string;
  entryType: BracketEntryType;
  status: TournamentStatus;
  startDate: number;
}
