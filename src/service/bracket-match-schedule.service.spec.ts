import { useFullModule } from '../@test/useFullModule';
import { BracketMatchService } from './bracket-match.service';
import { createBracket } from '../@test/test-util';
import { BracketsManager } from 'brackets-manager';
import {
  BracketMatchScheduleService,
  ROUND_OFFSET_SECONDS,
} from './bracket-match-schedule.service';
import { BracketCrud } from './bracket.crud';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { TournamentMapper } from '../mapper/tournament.mapper';

describe('BracketMatchService', () => {
  const te = useFullModule();

  let service: BracketMatchScheduleService;
  let bm: BracketsManager;
  let mapper: TournamentMapper;

  beforeEach(() => {
    service = te.service(BracketMatchScheduleService);
    bm = te.service(BracketsManager);
    mapper = te.service(TournamentMapper);
  });

  it('should do initial scheduling for simple bo-1 tournaments', async () => {
    // Given
    const bracket = await createBracket(te);
    await service.scheduleMatches(Number(bracket.tournament_id));
    const tournament = await te
      .repo(TournamentEntity)
      .findOneBy({ id: Number(bracket.tournament_id) });
    const bj = await te
      .service(BracketCrud)
      .getBracket(Number(bracket.tournament_id))
      .then(t => mapper.mapBracket(t, tournament));

    expect(bj.winning[0].seeds[0].scheduledDate).toEqual(tournament.startDate);
    expect(bj.winning[0].seeds[0].games[0].scheduledDate).toEqual(
      tournament.startDate,
    );
    expect(bj.winning[0].seeds[1].scheduledDate).toEqual(tournament.startDate);
    expect(bj.winning[0].seeds[1].games[0].scheduledDate).toEqual(
      tournament.startDate,
    );

    expect(bj.winning[1].seeds[0].scheduledDate).toEqual(
      new Date(tournament.startDate.getTime() + 3600 * 1000),
    );
    expect(bj.winning[1].seeds[0].games[0].scheduledDate).toEqual(
      bj.winning[1].seeds[0].scheduledDate,
    );

    console.log(JSON.stringify(bj));
  });

  it('should do initial scheduling for best-of-3 tournaments', async () => {
    // Given
    const bracket = await createBracket(te, {
      round: 3,
      final: 5,
      grandFinal: 1,
    });
    await service.scheduleMatches(Number(bracket.tournament_id));
    const tournament = await te
      .repo(TournamentEntity)
      .findOneBy({ id: Number(bracket.tournament_id) });
    const bj = await te
      .service(BracketCrud)
      .getBracket(Number(bracket.tournament_id))
      .then(t => mapper.mapBracket(t, tournament));

    console.log(JSON.stringify(bj));

    // First round
    expect(bj.winning[0].seeds[0].scheduledDate).toEqual(tournament.startDate);
    for (let i = 0; i < 3; i++) {
      expect(bj.winning[0].seeds[0].games[i].scheduledDate).toEqual(
        new Date(
          tournament.startDate.getTime() + ROUND_OFFSET_SECONDS * 1000 * i,
        ),
      );
    }


    // x3 because its 3 games per match
    const finalStart = new Date(tournament.startDate.getTime() + ROUND_OFFSET_SECONDS * 1000 * 3);
    // Final
    expect(bj.winning[1].seeds[0].scheduledDate).toEqual(finalStart);
    for (let i = 0; i < 3; i++) {
      expect(bj.winning[1].seeds[0].games[i].scheduledDate).toEqual(
        new Date(
          finalStart.getTime() + ROUND_OFFSET_SECONDS * 1000 * i,
        ),
      );
    }

    console.log(JSON.stringify(bj));
  });
});
