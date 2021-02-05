import { HttpException, Injectable, NotFoundException } from '@nestjs/common';

import { Connection, Repository } from 'typeorm';

import { BracketsManager } from 'brackets-manager';
import { InputStage } from 'brackets-model';
import { BracketCrud } from './bracket.crud';
import { TournamentEntity } from '../../db/entity/tournament.entity';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { BracketParticipantEntity } from '../../db/entity/bracket-participant.entity';
import { TeamEntity } from '../../db/entity/team.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketEntryType, BracketType } from '../../gateway/shared-types/tournament';

export type EntryIdType = string;

@Injectable()
export class BracketService {
  private readonly manager: BracketsManager;
  private tournamentEntityRepository: Repository<TournamentEntity>;

  constructor(
    private readonly stor: BracketCrud,
    private readonly connection: Connection,
    @InjectRepository(TeamEntity)
    private readonly teamEntityRepository: Repository<TeamEntity>,
    @InjectRepository(BracketParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      BracketParticipantEntity
    >,
  ) {
    this.manager = new BracketsManager(stor);
    this.tournamentEntityRepository = connection.getRepository(
      TournamentEntity,
    );
  }

  private static formatToPower<T>(arr: any[]): T[] {
    let ceilPower = 1;

    while (Math.pow(2, ceilPower) < arr.length) {
      ceilPower++;
    }

    // it's a power of 2 already
    if (Math.pow(2, ceilPower) === arr.length) return arr;

    const newArr = [...arr];
    for (let i = 0; i < Math.pow(2, ceilPower) - arr.length; i++) {
      newArr.push(null);
    }

    return newArr;
  }

  public async generateTournament(
    tId: number,
    type: BracketType,
    entryType: BracketEntryType,
    entries: EntryIdType[],
  ) {
    const example: InputStage = {
      name: 'Example',
      tournamentId: tId,
      type:
        type === BracketType.DOUBLE_ELIMINATION
          ? 'double_elimination'
          : 'single_elimination',
      seeding: BracketService.formatToPower(entries),
      settings: { seedOrdering: ['inner_outer'] },
    };

    await this.manager.create(example);
  }

  public async createTournament(name: string, type: BracketEntryType) {
    const t = new TournamentEntity();
    t.name = name;
    t.entryType = type;
    return await this.tournamentEntityRepository.save(t);
  }

  public async matchResults(
    tId: number,
    matchId: number,
    winnerName: EntryIdType,
  ) {
    const m: BracketMatchEntity = await this.stor.select('match', matchId);

    const winnerOpponent = (
      await this.stor.select<BracketParticipantEntity>('participant', {
        name: winnerName,
      })
    )[0];

    if (!winnerOpponent) return;

    if (
      m.opponent1?.id === winnerOpponent.id ||
      m.opponent2?.id === winnerOpponent.id
    ) {
      if (m.opponent1?.id === winnerOpponent.id) {
        m.opponent1.result = 'win';
      } else {
        m.opponent2.result = 'win';
      }

      await this.manager.update.match({
        id: m.id,
        opponent1: m.opponent1,
        opponent2: m.opponent2,
      });
    } else {
      throw 'pepe';
    }
  }

  public async registerTeam(tId: number, teamId: number) {
    const t = await this.tournamentEntityRepository.findOne(tId);
    if (!t) throw new NotFoundException();

    if (t.entryType !== BracketEntryType.TEAM) throw new NotFoundException();

    const team = await this.teamEntityRepository.findOne(teamId);
    if (!team) throw new NotFoundException();

    // TODO: manage conflicting members?


    const b = new BracketParticipantEntity();
    b.tournament_id = t.id;
    b.name = team.id;
    await this.bracketParticipantEntityRepository.save(b);
  }

  public async registerSoloPlayer(tId: number, steam_id: string) {
    const t = await this.tournamentEntityRepository.findOne(tId);
    if (!t) throw new NotFoundException();

    if (t.entryType !== BracketEntryType.PLAYER) throw new NotFoundException();

    const b = new BracketParticipantEntity();
    b.tournament_id = t.id;
    b.name = steam_id;
    await this.bracketParticipantEntityRepository.save(b);
  }
}
