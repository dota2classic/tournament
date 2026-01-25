import { useFullModule } from '../@test/useFullModule';
import { BracketMatchService } from './bracket-match.service';
import { createBracket } from '../@test/test-util';
import { BracketsManager } from 'brackets-manager';
import { MatchScheduleService } from './match-schedule.service';
import { TournamentMapper } from '../mapper/tournament.mapper';
import { BracketCrud } from './bracket.crud';
import { TournamentEntity } from '../db/entity/tournament.entity';

describe('BracketMatchService', () => {
  const te = useFullModule();

  let crud: BracketCrud;
  let service: MatchScheduleService;
  let bm: BracketsManager;
  let mapper: TournamentMapper;

  beforeEach(() => {
    crud = te.service(BracketCrud);
    service = te.service(MatchScheduleService);
    bm = te.service(BracketsManager);
    mapper = te.service(TournamentMapper);
  });

  it('when game finishes, it should try to schedule next match', async () => {
    // No matches are scheduled yet! Everything is null
    const bracket = await createBracket(te, {
      final: 3,
      round: 1,
      grandFinal: 1,
    });

    let bj = await crud.getBracket(Number(bracket.tournament_id));
    bj.match.sort((a, b) => a.id - b.id);

    // When
    await service.updateScheduleGameFinished(bj.match[0], 1);

    // Then
    bj = await crud.getBracket(Number(bracket.tournament_id));
    bj.match.sort((a, b) => a.id - b.id);

    console.log(JSON.stringify(bj));
    expect(bj.match[2].scheduledDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('should do initial scheduling for simple bo-1 tournaments', async () => {
    // Given
    const bracket = await createBracket(te);
    await service.scheduleMatches(Number(bracket.tournament_id));
    const tournament = await te.repo(TournamentEntity).findOneBy({
      id: Number(bracket.tournament_id),
    });
    const bj = await te
      .service(BracketCrud)
      .getBracket(Number(bracket.tournament_id))
      .then(t => mapper.mapBracket(t, tournament));

    // Matches in first round start when tournament starts
    expect(bj.winning[0].seeds[0].scheduledDate).toEqual(tournament.startDate);
    expect(bj.winning[0].seeds[0].games[0].scheduledDate).toEqual(
      tournament.startDate,
    );
    expect(bj.winning[0].seeds[1].scheduledDate).toEqual(tournament.startDate);
    expect(bj.winning[0].seeds[1].games[0].scheduledDate).toEqual(
      tournament.startDate,
    );

    // Matches in second round always start later
    expect(bj.winning[1].seeds[0].scheduledDate.getTime()).toBeGreaterThan(
      bj.winning[0].seeds[0].scheduledDate.getTime(),
    );
    expect(
      bj.winning[1].seeds[0].games[0].scheduledDate.getTime(),
    ).toBeGreaterThan(bj.winning[0].seeds[0].scheduledDate.getTime());
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

    // Matches in first round start when tournament starts
    expect(bj.winning[0].seeds[0].scheduledDate).toEqual(tournament.startDate);
    expect(bj.winning[0].seeds[0].games[0].scheduledDate).toEqual(
      tournament.startDate,
    );
    expect(bj.winning[0].seeds[1].scheduledDate).toEqual(tournament.startDate);
    expect(bj.winning[0].seeds[1].games[0].scheduledDate).toEqual(
      tournament.startDate,
    );

    // Matches in second round always start later
    expect(bj.winning[1].seeds[0].scheduledDate.getTime()).toBeGreaterThan(
      bj.winning[0].seeds[0].scheduledDate.getTime(),
    );
    expect(
      bj.winning[1].seeds[0].games[0].scheduledDate.getTime(),
    ).toBeGreaterThan(bj.winning[0].seeds[0].scheduledDate.getTime());

    let previousScheduleDate: number = bj.winning[0].seeds[0].scheduledDate.getTime();
    for (let i = 0; i < 3; i++) {
      const gameScheduleTime = bj.winning[1].seeds[0].games[
        i
      ].scheduledDate.getTime();
      expect(gameScheduleTime).toBeGreaterThan(previousScheduleDate);
      previousScheduleDate = gameScheduleTime;
    }
  });
});
