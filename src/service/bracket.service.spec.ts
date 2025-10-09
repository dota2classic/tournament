import { useFullModule } from '../@test/useFullModule';
import { BracketService } from './bracket.service';
import { createTournamentWithParticipants } from '../@test/test-util';
import { BracketType, TournamentStatus } from '../gateway/shared-types/tournament';
import { RoundEntity } from '../db/entity/round.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';

describe('BracketService', () => {
  const te = useFullModule();

  let service: BracketService;

  beforeEach(() => {
    service = te.service(BracketService);
  });

  it('should generate a bracket', async () => {
    // Given
    const tour = await createTournamentWithParticipants(
      te,
      TournamentStatus.IN_PROGRESS,
      4
    );

    // When
    const stage = await service.generateBracket(tour.id);

    // Then
    await expect(
      te.repo(RoundEntity).find({ where: { stage_id: stage.id } }),
    ).resolves.toHaveLength(2); // Semi finals + finals

    await expect(
      te.repo(BracketMatchEntity).find({ where: { stage_id: stage.id } }),
    ).resolves.toHaveLength(3); // 2 x Semifinals + finals

    await expect(
      te.repo(BracketMatchGameEntity)
        .createQueryBuilder('mge')
        .innerJoin('mge.match', 'm')
        .where('m.stage_id = :stageId', { stageId: stage.id })
        .getMany()
    ).resolves.toHaveLength(3); // 2 x Semifinals + finals
  });
});
