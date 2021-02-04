import { BracketEntryType } from '../tournament/bracket.service';

export class CreateTournamentDto {
  name: string;
  entryType: BracketEntryType
}


export class TournamentDto {
  id: number;
  name: string;
  entryType: BracketEntryType
}
