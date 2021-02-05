import { BracketEntryType } from '../../gateway/shared-types/tournament';

export class CreateTournamentDto {
  name: string;
  entryType: BracketEntryType
}


export class TournamentDto {
  id: number;
  name: string;
  entryType: BracketEntryType
}
