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
