import { useFullModule } from '../@test/useFullModule';
import { BracketMatchService } from './bracket-match.service';
import { createNativeTournament } from '../@test/test-util';
import { BracketsManager } from 'brackets-manager';
import { Status } from 'brackets-model';
import { StageEntity } from '../db/entity/stage.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';

describe('BracketMatchService', () => {
  const te = useFullModule();

  let service: BracketMatchService;
  let bm: BracketsManager;

  beforeEach(() => {
    service = te.service(BracketMatchService);
    bm = te.service(BracketsManager);
  });

  it('should mark remaining games in bo-x as archived if result is ready', async () => {
    // Given
    const tournament = await createNativeTournament(te, {
      round: 3,
      final: 3,
      grandFinal: 3,
    });
    const stage = await te
      .repo(StageEntity)
      .findOneBy({ tournament_id: tournament.id });

    const firstMatch = await te.repo(BracketMatchEntity).findOne({
      where: {
        stage_id: stage.id,
      },
      order: {
        number: 'ASC',
      },
      relations: ['games'],
    });

    const firstGame = firstMatch.games[0];
    const secondGame = firstMatch.games[1];
    const thirdGame = firstMatch.games[2];

    // Win first game
    await service.setGameWinner(firstGame.id, firstGame.opponent1.id);
    // Win second game
    await service.setGameWinner(secondGame.id, firstGame.opponent1.id);

    // Match should be finished now
    const m = await te.repo(BracketMatchEntity).findOne({
      where: {
        id: firstMatch.id,
      },
      order: {
        number: 'ASC',
      },
      relations: ['games'],
    });
    m.games.sort((a, b) => a.number - b.number);

    console.log(JSON.stringify(m));

    // Expect match result
    expect(m).toEqual(
      expect.objectContaining({
        status: Status.Completed,
        opponent1: expect.objectContaining({ score: 2, result: 'win' }),
        opponent2: expect.objectContaining({ score: 0, result: 'loss' }),
      }),
    );

    // Expect game3 status
    expect(m.games[2].status).toEqual(Status.Archived);
  });

  it('should update bracket match with a winner in bo-1', async () => {
    // Given
    const tournament = await createNativeTournament(te);
    const stage = await te
      .repo(StageEntity)
      .findOneBy({ tournament_id: tournament.id });

    const firstMatch = await te.repo(BracketMatchEntity).findOne({
      where: {
        stage_id: stage.id,
      },
      order: {
        number: 'ASC',
      },
      relations: ['games'],
    });

    const firstGame = firstMatch.games[0];

    // When
    await service.setGameWinner(firstGame.id, firstGame.opponent1.id);

    // Then
    const m = await bm.storage.selectFirst('match', {
      id: firstMatch.id,
      stage_id: stage.id,
    });

    expect(m).toEqual(
      expect.objectContaining({
        status: Status.Completed,
        opponent1: expect.objectContaining({ score: 1, result: 'win' }),
        opponent2: expect.objectContaining({ score: 0, result: 'loss' }),
      }),
    );
  });
});
