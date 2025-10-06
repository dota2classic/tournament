import { useFullModule } from '../../@test/useFullModule';
import { BracketService } from './bracket.service';
import {
  BracketEntryType,
  BracketType,
} from '../../gateway/shared-types/tournament';
import { Dota2Version } from '../../gateway/shared-types/dota2version';

describe('BracketService', () => {
  const te = useFullModule();

  let bs: BracketService;

  beforeEach(() => {
    bs = te.service(BracketService);
  });

  it('should create a tournament', async () => {
    const tournament = await bs.createTournament(
      'test',
      BracketEntryType.PLAYER,
      new Date(2026, 1, 0),
      'url',
      Dota2Version.Dota_684,
      BracketType.SINGLE_ELIMINATION,
      {
        round: 1,
        final: 1,
        grandFinal: 1,
      },
    );
  });
});
