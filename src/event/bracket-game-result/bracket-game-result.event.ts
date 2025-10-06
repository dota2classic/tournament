export class BracketGameResultEvent {
  constructor(
    public readonly gameId: number,
    public readonly winner: 'opponent1' | 'opponent2'
  ) {
  }
}
