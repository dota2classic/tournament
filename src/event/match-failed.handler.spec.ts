import { useFullModule } from '../@test/useFullModule';
import { BracketsManager } from 'brackets-manager';
import { MatchFailedHandler } from './match-failed.handler';
import { createNativeTournament } from '../@test/test-util';
import { StageEntity } from '../db/entity/stage.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { MatchFailedEvent } from '../gateway/events/match-failed.event';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { ParticipantPlayerEntity } from '../db/entity/participant-player.entity';
import { Status } from 'brackets-model';

describe('MatchFailedHandler', () => {
  const te = useFullModule();

  let handler: MatchFailedHandler;
  let bm: BracketsManager;

  beforeEach(() => {
    handler = te.service(MatchFailedHandler);
    bm = te.service(BracketsManager);
  });

  it('should handle one sided failure', async () => {
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

    const d2cId = Math.floor(Math.random() * 1000000);

    const firstGame = firstMatch.games[0];
    await te.repo(BracketMatchGameEntity).update(
      {
        id: firstGame.id,
      },
      {
        externalMatchId: d2cId,
      },
    );

    const failedPlayers = await te.repo(ParticipantPlayerEntity).find({
      where: {
        tournamentParticipantId: Number(firstMatch.opponent1.id),
      },
    });

    // When
    await handler.handle(
      new MatchFailedEvent(
        d2cId,
        'fsdf',
        failedPlayers.map((t) => t.steamId).slice(0, 1),
        [],
      ),
    );

    // Then
    const m = await bm.storage.selectFirst('match', {
      id: firstMatch.id,
      stage_id: stage.id,
    });

    expect(m).toEqual(
      expect.objectContaining({
        status: Status.Completed,
        opponent1: expect.objectContaining({ score: 0, result: 'loss' }),
        opponent2: expect.objectContaining({ score: 1, result: 'win' }),
      }),
    );
  });
});
