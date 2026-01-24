import { testUser, useFullModule } from './@test/useFullModule';
import { TournamentService } from './service/tournament.service';
import * as request from 'supertest';
import { BracketDto } from './model/tournament.dto';
import { BracketMatchService } from './service/bracket-match.service';
import { Status } from 'brackets-model';

describe('TournamentService', () => {
  jest.setTimeout(60000);

  const te = useFullModule();

  const createTournament = async (): Promise<number> => {
    const res = await request(te.app.getHttpServer())
      .post('/tournament')
      .send({
        name: 'Test tournament',
        teamSize: 1,
        description: 'Test tournament',
        startDate: new Date().toISOString(),
        imageUrl: 'img',
        strategy: 'SINGLE_ELIMINATION',
        roundBestOf: 1,
        finalBestOf: 1,
        grandFinalBestOf: 1,
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

  it('should complete tournament flow', async () => {
    const tournamentId = await createTournament();
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
    await startReadyCheck(tournamentId);
    // Confirm readiness of 4 players
    for (let i = 0; i < 4; i++) {
      await confirmReadyCheck(tournamentId, participants[i], true);
    }
    // Set explicitly not ready player #5
    // Player #6 should be timed out
    await confirmReadyCheck(tournamentId, participants[4], false);

    // Finish ready check
    await finishReadyCheck(tournamentId);
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
    // await service.setGameWinner(
    //   Number(bracket.tournament_id),
    //   firstMatch.parent_id,
    //   firstMatch.id,
    //   firstMatch.opponent1.id,
    // );
    //
    await te
      .service(BracketMatchService)
      .setGameWinner(
        tournamentId,
        bracket.winning[0].seeds[0].id,
        bracket.winning[0].seeds[0].games[0].gameId,
        bracket.winning[0].seeds[0].teams[0].id,
        123,
        false,
      );

    bracket = await getBracket(tournamentId);
    bracket.winning[0].seeds.sort((a, b) => a.id - b.id);
    console.log(JSON.stringify(bracket));
    expect(bracket.winning[0].seeds[0].teams[0].result).toEqual('win');
    expect(bracket.winning[0].seeds[0].teams[0].score).toEqual(1);
    expect(bracket.winning[0].seeds[0].teams[1].result).toEqual('loss');
    expect(bracket.winning[0].seeds[0].teams[1].score).toEqual(0);
    expect(bracket.winning[0].seeds[0].status).toEqual(Status.Completed);
    expect(bracket.winning[0].seeds[0].games[0].status).toEqual(
      Status.Completed,
    );
    expect(bracket.winning[0].seeds[0].games[0].status).toEqual(
      Status.Completed,
    );
  });
});
