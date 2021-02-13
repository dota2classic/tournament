export class BracketGameTimerReadyEvent {
  constructor(
    public readonly tournamentId: number,
    public readonly matchId: number,
    public readonly gameId: number,
  ) {}
}
