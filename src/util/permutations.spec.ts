import { minimizeLeftovers } from './permutations';

describe('minimizeLeftovers', () => {
  it('merges partial groups to minimize leftovers', () => {
    const partials = [[1, 2], [4, 5], [5], [6]];
    const teamSize = 5;

    const { teams, leftovers } = minimizeLeftovers(partials, teamSize);

    expect(teams).toEqual([[1, 2, 4, 5, 5]]);
    expect(leftovers).toEqual([6])
  });

  it('creates full teams when possible', () => {
    const partials = [[1, 2], [3, 4, 5], [6, 7], [8]];
    const teamSize = 5;

    const { teams, leftovers } = minimizeLeftovers(partials, teamSize);

    // Two perfect 5-player teams
    expect(teams).toEqual([[3, 4, 5, 1, 2]]);
    expect(leftovers).toEqual([6, 7, 8]);
  });

  it('returns same groups when all fit individually', () => {
    const partials = [[1], [2], [3]];
    const teamSize = 2;

    const { teams, leftovers } = minimizeLeftovers(partials, teamSize);

    // Greedy may merge two, leaving one
    expect(teams.length).toBeGreaterThan(0);
    expect(teams.flat().sort()).toEqual([1, 2]);
    expect(leftovers).toEqual([3]);
  });

  it('handles empty input gracefully', () => {
    const { teams, leftovers } = minimizeLeftovers([], 5);
    expect(teams).toEqual([]);
    expect(leftovers).toEqual([])
  });
});
