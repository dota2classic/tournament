export function minimizeLeftovers<T>(
  partials: T[][],
  teamSize: number
): { teams: T[][]; leftovers: T[] } {
  if (teamSize <= 0) throw new Error('teamSize must be > 0');

  // Step 1: validate input groups
  const normalized: T[][] = [];
  for (const group of partials) {
    if (group.length <= teamSize) {
      normalized.push([...group]);
    } else {
      throw new Error('Group size should not exceed team size!');
    }
  }

  // Step 2: First-Fit-Decreasing greedy packing
  const sorted = normalized.slice().sort((a, b) => b.length - a.length);
  const teams: T[][] = [];
  const leftovers: T[] = [];

  for (const g of sorted) {
    let placed = false;
    for (const team of teams) {
      if (team.length + g.length <= teamSize) {
        team.push(...g);
        placed = true;
        break;
      }
    }
    if (!placed) teams.push([...g]);
  }

  // Step 3: separate incomplete teams into leftovers
  const completeTeams: T[][] = [];
  for (const team of teams) {
    if (team.length === teamSize) {
      completeTeams.push(team);
    } else {
      leftovers.push(...team);
    }
  }

  return { teams: completeTeams, leftovers };
}
