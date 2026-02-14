import { useFullModule } from '../@test/useFullModule';
import { createTournamentWithParticipants } from '../@test/test-util';
import { TournamentStatus } from '../gateway/shared-types/tournament';
import { RoundEntity } from '../db/entity/round.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { BracketService } from './bracket.service';
import { BracketsManager } from 'brackets-manager';

describe('BracketService', () => {
  const te = useFullModule();

  let service: BracketService;

  beforeEach(() => {
    service = te.service(BracketService);
  });

  it('should generate a bracket without BYEs', async () => {
    // Given
    const tour = await createTournamentWithParticipants(
      te,
      TournamentStatus.IN_PROGRESS,
      4,
    );

    // When
    const stage = await service.generateBracket(tour.id);

    // Then
    await expect(
      te.repo(RoundEntity).find({ where: { stage_id: stage.id } }),
    ).resolves.toHaveLength(2); // Semi finals + finals

    await expect(
      te
        .repo(BracketMatchEntity)
        .find({ where: { stage_id: Number(stage.id) } }),
    ).resolves.toHaveLength(3); // 2 x Semifinals + finals

    await expect(
      te
        .repo(BracketMatchGameEntity)
        .createQueryBuilder('mge')
        .innerJoin('mge.match', 'm')
        .where('m.stage_id = :stageId', { stageId: stage.id })
        .getMany(),
    ).resolves.toHaveLength(3); // 2 x Semifinals + finals
  });

  it('should generate a bracket with BYEs', async () => {
    // Given: 6 participants, should make a 2^3 bracket

    const tour = await createTournamentWithParticipants(
      te,
      TournamentStatus.IN_PROGRESS,
      6,
    );

    // When
    const stage = await service.generateBracket(tour.id);

    // Then
    await expect(
      te.repo(RoundEntity).find({ where: { stage_id: stage.id } }),
    ).resolves.toHaveLength(3); // Round with byes + Semi finals + finals

    await expect(
      te
        .repo(BracketMatchEntity)
        .find({ where: { stage_id: Number(stage.id) } }),
    ).resolves.toHaveLength(7); // 4 x round + 2 x Semifinals + finals

    await expect(
      te
        .repo(BracketMatchGameEntity)
        .createQueryBuilder('mge')
        .innerJoin('mge.match', 'm')
        .where('m.stage_id = :stageId', { stageId: stage.id })
        .getMany(),
    ).resolves.toHaveLength(5); // 2 real games in r1 +  2 x Semifinals + finals
  });

  it('should re-generate bracket with random shuffle', async () => {
    const bm = te.service(BracketsManager);
    const tour = await createTournamentWithParticipants(
      te,
      TournamentStatus.IN_PROGRESS,
      128,
    );

    let stage = await service.generateBracket(tour.id);
    let sd = await bm.get.stageData(stage.id);
    let firstRound = sd.round.sort((a, b) => a.number - b.number)[0];
    let matchesInFirstRound = sd.match
      .filter((m) => m.round_id === firstRound.id)
      .sort((a, b) => a.number - b.number - b.number);

    const firstRoundWas = matchesInFirstRound.flatMap((m) => [
      m.opponent1?.id,
      m.opponent2?.id,
    ]);

    // When
    stage = await service.regenerateBracket(tour.id);

    sd = await bm.get.stageData(stage.id);
    firstRound = sd.round.sort((a, b) => a.number - b.number)[0];
    matchesInFirstRound = sd.match
      .filter((m) => m.round_id === firstRound.id)
      .sort((a, b) => a.number - b.number - b.number);

    const newRound = matchesInFirstRound.flatMap((m) => [
      m.opponent1?.id,
      m.opponent2?.id,
    ]);

    expect(newRound).not.toEqual(firstRoundWas);
  });
});
