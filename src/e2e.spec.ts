import { testUser, useFullModule } from './@test/useFullModule';
import { TournamentService } from './service/tournament.service';
import * as request from 'supertest';
import { BracketDto, SeedDto } from './model/tournament.dto';
import { BracketMatchService } from './service/bracket-match.service';
import { Status } from 'brackets-model';
import { tap } from 'rxjs';
import { TournamentReadyCheckDeclinedEvent } from './gateway/events/tournament/tournament-ready-check-declined.event';
import { TournamentReadyCheckStartedEvent } from './gateway/events/tournament/tournament-ready-check-started.event';

describe('TournamentService', () => {
  jest.setTimeout(60000);

  const te = useFullModule();

  const collectEvents = () => {
    const collectedEvents: any[] = [];
    const obs = te.ebus.pipe(tap(evt => collectedEvents.push(evt))).subscribe();

    return () => {
      obs.unsubscribe();
      return collectedEvents;
    };
  };

  const createTournament = async (
    rbo = 1,
    fbo = 1,
    gfbo = 1,
  ): Promise<number> => {
    const res = await request(te.app.getHttpServer())
      .post('/tournament')
      .send({
        name: 'Test tournament',
        teamSize: 1,
        description: 'Test tournament',
        startDate: new Date().toISOString(),
        imageUrl: 'img',
        strategy: 'SINGLE_ELIMINATION',
        roundBestOf: rbo,
        finalBestOf: fbo,
        grandFinalBestOf: gfbo,
      })
      .expect(201);

    // Assertions on response body
    expect(res.body).toBeDefined();
    expect(res.body.id).toBeDefined();

    expect(res.body.status).toBe('DRAFT');

    // Save for later test steps
    return res.body.id;
  };

  const publishTournament = async (tid: number) => {
    const res = await request(te.app.getHttpServer())
      .post(`/tournament/${tid}/publish_tournament`)
      .send()
      .expect(201);

    // Assertions on response body
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('REGISTRATION');
    return res.body;
  };

  const startReadyCheck = async (tid: number) => {
    const res = await request(te.app.getHttpServer())
      .post(`/tournament/${tid}/end_registration`)
      .send()
      .expect(201);

    // Assertions on response body
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('READY_CHECK');
    return res.body;
  };

  const finishReadyCheck = async (tid: number) => {
    const res = await request(te.app.getHttpServer())
      .post(`/tournament/${tid}/end_ready_check`)
      .send()
      .expect(201);

    // Assertions on response body
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('IN_PROGRESS');
    return res.body;
  };

  const generateBracket = async (tid: number) => {
    const res = await request(te.app.getHttpServer())
      .post(`/tournament/${tid}/generate_bracket`)
      .expect(201);

    // Assertions on response body
    expect(res.body).toBeDefined();
    return res.body;
  };

  const getBracket = async (tid: number) => {
    const res = await request(te.app.getHttpServer())
      .get(`/tournament/${tid}/bracket`)
      .expect(200);

    // Assertions on response body
    expect(res.body).toBeDefined();
    return res.body;
  };

  const createParticipant = async (tid: number, steamIds: string[]) => {
    const res = await request(te.app.getHttpServer())
      .post(`/tournament/${tid}/register`)
      .send({
        steamIds,
      })
      .expect(201);

    // Assertions on response body
    expect(res.body).toBeDefined();
    return res.body;
  };

  const confirmReadyCheck = async (
    tid: number,
    steamId: string,
    confirm: boolean,
  ) => {
    const res = await request(te.app.getHttpServer())
      .post(`/tournament/${tid}/confirm_registration`)
      .send({
        steamId,
        confirm,
      })
      .expect(201);

    // Assertions on response body
    expect(res.body).toBeDefined();
    return res.body;
  };

  const assertMatchStatus = (seed: SeedDto, status: Status) => {
    expect(seed.status).toEqual(status);
    expect(seed.games[0].status).toEqual(status);
  };

  const assertMatchComplete = (
    seed: SeedDto,
    winnerIdx: 1 | 0,
    scores: [number, number] = [1, 0],
    completeStatus: Status = Status.Completed,
  ) => {
    const loserIdx = 1 - winnerIdx;
    expect(seed.teams[winnerIdx].result).toEqual('win');
    expect(seed.teams[winnerIdx].score).toEqual(scores[0]);
    expect(seed.teams[loserIdx].result).toEqual('loss');
    expect(seed.teams[loserIdx].score).toEqual(scores[1]);

    assertMatchStatus(seed, completeStatus);
  };

  it('should complete tournament flow', async () => {
    const tournamentId = await createTournament(1, 3, 1);
    // Publish tournament
    await publishTournament(tournamentId);
    // Create 6 registrations
    let participants: string[] = [];
    for (let i = 0; i < 6; i++) {
      const steamId = testUser();
      await createParticipant(tournamentId, [steamId]);
      participants.push(steamId);
    }
    // Finish registration and start ready check
    let collectEvents$ = collectEvents();
    await startReadyCheck(tournamentId);

    // At least 4 ready checks should be emitted
    const readyCheckEvents = collectEvents$();
    expect(
      readyCheckEvents.filter(
        t => t instanceof TournamentReadyCheckStartedEvent,
      ).length,
    ).toBeGreaterThanOrEqual(4);

    // Confirm readiness of 4 players
    for (let i = 0; i < 4; i++) {
      await confirmReadyCheck(tournamentId, participants[i], true);
    }
    // Set explicitly not ready player #5
    // Player #6 should be timed out
    await confirmReadyCheck(tournamentId, participants[4], false);

    // Finish ready check
    collectEvents$ = collectEvents();
    await finishReadyCheck(tournamentId);
    const timedOutEvents = collectEvents$();
    expect(
      timedOutEvents.filter(t => t instanceof TournamentReadyCheckDeclinedEvent)
        .length,
    ).toEqual(2);

    // Generate bracket and check that its correct
    let bracket: BracketDto = await generateBracket(tournamentId);
    bracket.winning[0].seeds.sort((a, b) => a.id - b.id);
    console.log(JSON.stringify(bracket));
    // It's a single elimination bracket
    expect(bracket.losing).toHaveLength(0);
    // With 2 rounds:  2 games -> final game
    expect(bracket.winning).toHaveLength(2);
    expect(bracket.winning[0].seeds).toHaveLength(2);
    expect(bracket.winning[0].seeds[0].teams[0].id).toBeDefined();
    expect(bracket.winning[0].seeds[0].teams[1].id).toBeDefined();
    expect(bracket.winning[1].seeds).toHaveLength(1);
    expect(bracket.winning[1].seeds[0].teams[0].tbd).toEqual(true);
    expect(bracket.winning[1].seeds[0].teams[1].tbd).toEqual(true);

    // Set a winner for a first game(emulate rabbitmq queue for simplicity)
    await te
      .service(BracketMatchService)
      .setGameWinner(
        tournamentId,
        bracket.winning[0].seeds[0].id,
        bracket.winning[0].seeds[0].games[0].gameId,
        bracket.winning[0].seeds[0].teams[0].id,
        100,
        false,
      );

    bracket = await getBracket(tournamentId);
    bracket.winning[0].seeds.sort((a, b) => a.id - b.id);
    assertMatchComplete(bracket.winning[0].seeds[0], 0);
    expect(bracket.winning[0].seeds[0].games[0].externalMatchId).toEqual(100);

    console.log(JSON.stringify(bracket));
    // Check that finals are now waiting for second opponent
    assertMatchStatus(bracket.winning[1].seeds[0], Status.Waiting);

    // Set a winner for a second game(emulate rabbitmq queue for simplicity)
    await te
      .service(BracketMatchService)
      .setGameWinner(
        tournamentId,
        bracket.winning[0].seeds[1].id,
        bracket.winning[0].seeds[1].games[0].gameId,
        bracket.winning[0].seeds[1].teams[1].id,
        200,
        false,
      );

    bracket = await getBracket(tournamentId);
    bracket.winning[0].seeds.sort((a, b) => a.id - b.id);
    assertMatchComplete(bracket.winning[0].seeds[1], 1);
    expect(bracket.winning[0].seeds[1].games[0].externalMatchId).toEqual(200);

    // Check that finals are now ready to be played
    assertMatchStatus(bracket.winning[1].seeds[0], Status.Ready);

    // Let's play finals! we aim for 2-1 for 'first' team
    const seed = bracket.winning[1].seeds[0];

    // Win first game
    await te
      .service(BracketMatchService)
      .setGameWinner(
        tournamentId,
        seed.id,
        seed.games[0].gameId,
        seed.teams[0].id,
        300,
        false,
      );

    // Lose second
    await te
      .service(BracketMatchService)
      .setGameWinner(
        tournamentId,
        seed.id,
        seed.games[1].gameId,
        seed.teams[1].id,
        400,
        false,
      );

    // Win third
    await te
      .service(BracketMatchService)
      .setGameWinner(
        tournamentId,
        seed.id,
        seed.games[2].gameId,
        seed.teams[0].id,
        500,
        false,
      );

    bracket = await getBracket(tournamentId);
    assertMatchComplete(
      bracket.winning[1].seeds[0],
      0,
      [2, 1],
      Status.Archived,
    );
    expect(bracket.winning[1].seeds[0].games[0].externalMatchId).toEqual(300);
    expect(bracket.winning[1].seeds[0].games[1].externalMatchId).toEqual(400);
    expect(bracket.winning[1].seeds[0].games[2].externalMatchId).toEqual(500);

    expect(bracket.winning[0].seeds[0].status).toEqual(Status.Archived);
    expect(bracket.winning[0].seeds[1].status).toEqual(Status.Archived);
  });
});
