import { useFullModule } from '../@test/useFullModule';
import { BracketMatchService } from './bracket-match.service';
import { createNativeTournament } from '../@test/test-util';
import { BracketsManager } from 'brackets-manager';
import { MatchScheduleService } from './match-schedule.service';
import { TournamentMapper } from '../mapper/tournament.mapper';
import { BracketCrud } from './bracket.crud';
import { addHours } from 'date-fns';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';

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
    const tournament = await createNativeTournament(
      te,
      {
        final: 3,
        round: 1,
        grandFinal: 1,
      },
      4,
    );

    let bj = await crud.getBracket(tournament.id);
    bj.match.sort((a, b) => a.id - b.id);

    // When
    await service.updateScheduleGameFinished(bj.match[0], 1);

    // Then
    bj = await crud.getBracket(tournament.id);
    bj.match.sort((a, b) => a.id - b.id);
    // It was null, so it got scheduled at now + break time
    expect(bj.match[2].scheduledDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('when game finishes and tries to schedule next match, it should not if its too far in future', async () => {
    // No matches are scheduled yet! Everything is null
    const tournament = await createNativeTournament(
      te,
      {
        final: 3,
        round: 1,
        grandFinal: 1,
      },
      4,
    );

    let bj = await crud.getBracket(tournament.id);
    bj.match.sort((a, b) => a.id - b.id);

    const longFutureSchedule = addHours(new Date(), 10);
    await crud.update('match', bj.match[2].id, {
      scheduledDate: longFutureSchedule,
    });
    await te
      .repo(BracketMatchGameEntity)
      .update(
        { parent_id: bj.match[2].id },
        { scheduledDate: longFutureSchedule },
      );

    // When
    await service.updateScheduleGameFinished(bj.match[0], 1);

    // Then
    bj = await crud.getBracket(tournament.id);
    bj.match.sort((a, b) => a.id - b.id);
    // It was null, so it got scheduled at now + break time
    expect(bj.match[2].scheduledDate).toEqual(longFutureSchedule);
  });

  it('should update subsequent games inside a match', async () => {
    /**
     *
     * [4,8]
     *       \
     *        [8, 16]
     *      /
     * [15,16]
     *
     */
    const tournament = await createNativeTournament(te, {
      final: 3,
      round: 1,
      grandFinal: 1,
    });
    let bj = await crud.getBracket(tournament.id);
    bj.match.sort((a, b) => a.id - b.id);

    // When we update match in round 3, only finals should update
    const final = bj.round.find((t) => t.number === 2);
    const finalMatch = bj.match.find((m) => m.round_id === final.id);
    await service.updateScheduleGameFinished(finalMatch, 1);

    // Then
    const finalGames = await te.repo(BracketMatchGameEntity).find({
      where: {
        parent_id: finalMatch.id,
      },
      order: {
        number: 'ASC',
      },
    });

    expect(finalGames[0].scheduledDate).toBeFalsy();
    expect(finalGames[1].scheduledDate).toBeDefined();
    expect(finalGames[2].scheduledDate).toBeDefined();
  });

  it('should only update subsequent matches and not previous', async () => {
    // 16 participants
    /**
     * [1,2]\   [2,4] \
     * [3,4]/           [4,8]
     * [5,6]\   [6,8] /        \
     * [7,8]/                 [8, 16]
     * [9,10]\  [10,12] \      /
     * [11,12]/          [12, 16]
     * [13,14]\ [14,16] /
     * [15,16]/
     *
     */
    const tournament = await createNativeTournament(
      te,
      {
        final: 1,
        round: 1,
        grandFinal: 1,
      },
      16,
    );
    let bj = await crud.getBracket(tournament.id);
    bj.match.sort((a, b) => a.id - b.id);

    // When we update match in round 3, only finals should update
    const thirdRound = bj.round.find((t) => t.number === 3);
    const thirdRoundMatch = bj.match.find((m) => m.round_id === thirdRound.id);

    await service.updateScheduleGameFinished(thirdRoundMatch, 1);

    // Then
    bj = await crud.getBracket(tournament.id);
    bj.match.sort((a, b) => a.id - b.id);
    // Only final is scheduled
    expect(bj.match[bj.match.length - 1].scheduledDate).toBeTruthy();

    expect(bj.match.filter((t) => t.scheduledDate)).toHaveLength(1);
  });

  it('should do initial scheduling for simple bo-1 tournaments', async () => {
    // Given
    const tournament = await createNativeTournament(
      te,
      {
        final: 1,
        round: 1,
        grandFinal: 1,
      },
      4,
    );
    await service.scheduleMatches(tournament.id);
    const bj = await te
      .service(BracketCrud)
      .getBracket(tournament.id)
      .then((t) => mapper.mapBracket(t, tournament));

    // Matches in first round start when tournament starts
    expect(bj.winning[0].seeds[0].scheduledDate).toEqual(
      tournament.startDate.toISOString(),
    );
    expect(bj.winning[0].seeds[0].games[0].scheduledDate).toEqual(
      tournament.startDate.toISOString(),
    );
    expect(bj.winning[0].seeds[1].scheduledDate).toEqual(
      tournament.startDate.toISOString(),
    );
    expect(bj.winning[0].seeds[1].games[0].scheduledDate).toEqual(
      tournament.startDate.toISOString(),
    );

    // Matches in second round always start later
    expect(
      new Date(bj.winning[1].seeds[0].scheduledDate).getTime(),
    ).toBeGreaterThan(new Date(bj.winning[0].seeds[0].scheduledDate).getTime());
    expect(
      new Date(bj.winning[1].seeds[0].games[0].scheduledDate).getTime(),
    ).toBeGreaterThan(new Date(bj.winning[0].seeds[0].scheduledDate).getTime());
  });

  it('should do initial scheduling for best-of-3 tournaments', async () => {
    // Given
    const tournament = await createNativeTournament(
      te,
      {
        final: 5,
        round: 3,
        grandFinal: 1,
      },
      4,
    );
    await service.scheduleMatches(tournament.id);
    const bj = await te
      .service(BracketCrud)
      .getBracket(tournament.id)
      .then((t) => mapper.mapBracket(t, tournament));

    // Matches in first round start when tournament starts
    expect(bj.winning[0].seeds[0].scheduledDate).toEqual(
      tournament.startDate.toISOString(),
    );
    expect(bj.winning[0].seeds[0].games[0].scheduledDate).toEqual(
      tournament.startDate.toISOString(),
    );
    expect(bj.winning[0].seeds[1].scheduledDate).toEqual(
      tournament.startDate.toISOString(),
    );
    expect(bj.winning[0].seeds[1].games[0].scheduledDate).toEqual(
      tournament.startDate.toISOString(),
    );

    // Matches in second round always start later
    expect(
      new Date(bj.winning[1].seeds[0].scheduledDate).getTime(),
    ).toBeGreaterThan(new Date(bj.winning[0].seeds[0].scheduledDate).getTime());
    expect(
      new Date(bj.winning[1].seeds[0].games[0].scheduledDate).getTime(),
    ).toBeGreaterThan(new Date(bj.winning[0].seeds[0].scheduledDate).getTime());

    let previousScheduleDate: number = new Date(
      bj.winning[0].seeds[0].scheduledDate,
    ).getTime();
    for (let i = 0; i < 3; i++) {
      const gameScheduleTime = new Date(
        bj.winning[1].seeds[0].games[i].scheduledDate,
      ).getTime();
      expect(gameScheduleTime).toBeGreaterThan(previousScheduleDate);
      previousScheduleDate = gameScheduleTime;
    }
  });

  it('should support manual scheduling of a first game in bo3 and updating subsequent', async () => {
    const tournament = await createNativeTournament(
      te,
      {
        final: 3,
        round: 3,
        grandFinal: 1,
      },
      4,
    );
    await service.scheduleMatches(tournament.id);
    let bj = await te
      .service(BracketCrud)
      .getBracket(tournament.id)
      .then((t) => mapper.mapBracket(t, tournament));

    const start = new Date(2030, 1, 1);

    // When
    await service.scheduleMatchGame(
      bj.winning[0].seeds[0].games[0].gameId,
      start,
    );

    // Then
    bj = await te
      .service(BracketCrud)
      .getBracket(tournament.id)
      .then((t) => mapper.mapBracket(t, tournament));

    expect(bj.winning[0].seeds[0].games[0].scheduledDate).toEqual(
      start.toISOString(),
    );
  });

  it('should support manual scheduling of second game in bo3 and updating subsequent', async () => {
    const tournament = await createNativeTournament(
      te,
      {
        final: 3,
        round: 3,
        grandFinal: 1,
      },
      4,
    );
    await service.scheduleMatches(tournament.id);
    let bj = await te
      .service(BracketCrud)
      .getBracket(tournament.id)
      .then((t) => mapper.mapBracket(t, tournament));

    const start = new Date(2030, 1, 1);

    // When
    await service.scheduleMatchGame(
      bj.winning[0].seeds[0].games[1].gameId,
      start,
    );

    // Then
    bj = await te
      .service(BracketCrud)
      .getBracket(tournament.id)
      .then((t) => mapper.mapBracket(t, tournament));

    expect(bj.winning[0].seeds[0].games[1].scheduledDate).toEqual(
      start.toISOString(),
    );
  });
});
