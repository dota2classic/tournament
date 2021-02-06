import { Injectable, NotFoundException } from '@nestjs/common';

import { Connection, Repository } from 'typeorm';

import { BracketsManager } from 'brackets-manager';
import { InputStage } from 'brackets-model';
import { BracketCrud } from './bracket.crud';
import { TournamentEntity } from '../../db/entity/tournament.entity';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { BracketParticipantEntity } from '../../db/entity/bracket-participant.entity';
import { TeamEntity } from '../../db/entity/team.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BracketEntryType,
  BracketType,
  TournamentStatus,
} from '../../gateway/shared-types/tournament';
import { TournamentParticipantEntity } from '../../db/entity/tournament-participant.entity';

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
    @InjectRepository(TournamentParticipantEntity)
    private readonly tournamentParticipantEntityRepository: Repository<
      TournamentParticipantEntity
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

  /**
   * Calling this will lock tournament
   * @param tId
   * @param type
   */
  public async generateTournament(tId: number) {
    const tournament = await this.tournamentEntityRepository.findOne(tId);
    if (!tournament || tournament.status !== TournamentStatus.NEW) return;

    const entries = (
      await this.tournamentParticipantEntityRepository.find({
        tournament_id: tId,
      })
    ).map(z => z.name);

    const example: InputStage = {
      name: 'Example',
      tournamentId: tId,
      type:
        tournament.strategy === BracketType.DOUBLE_ELIMINATION
          ? 'double_elimination'
          : 'single_elimination',
      seeding: BracketService.formatToPower(entries),
      settings: { seedOrdering: ['inner_outer'], grandFinal: 'simple' },
    };

    await this.manager.create(example);

    tournament.status = TournamentStatus.ONGOING;
    await this.tournamentEntityRepository.save(tournament);
  }

  public async createTournament(
    name: string,
    type: BracketEntryType,
    startDate: number,
    imageUrl: string,
    strategy: BracketType,
  ) {
    const t = new TournamentEntity();
    t.name = name;
    t.entryType = type;
    t.startDate = new Date(startDate);
    t.imageUrl = imageUrl;
    t.strategy = strategy;
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

  public async registerTeam(tId: number, teamId: string) {
    const t = await this.tournamentEntityRepository.findOne(tId);
    if (!t) throw new NotFoundException();

    if (t.entryType !== BracketEntryType.TEAM) throw new NotFoundException();

    const team = await this.teamEntityRepository.findOne(teamId);
    if (!team) throw new NotFoundException();

    // TODO: manage conflicting members?

    const b = new TournamentParticipantEntity();
    b.tournament_id = t.id;
    b.name = team.id;
    await this.tournamentParticipantEntityRepository.save(b);
  }

  public async registerSoloPlayer(tId: number, steam_id: string) {
    const t = await this.tournamentEntityRepository.findOne(tId);
    if (!t) throw new NotFoundException();

    if (t.entryType !== BracketEntryType.PLAYER) throw new NotFoundException();

    const b = new TournamentParticipantEntity();
    b.tournament_id = t.id;
    b.name = steam_id;
    await this.tournamentParticipantEntityRepository.save(b);
  }

  public async registeredTeams(id: number): Promise<TeamEntity[]> {
    const query = this.bracketParticipantEntityRepository
      .createQueryBuilder('p')
      .leftJoin(
        TournamentEntity,
        'tournament',
        'p.tournament_id = tournament.id',
      )
      .leftJoinAndMapOne('p.team', TeamEntity, 'team', 'p.name = team.id::text')
      .where('tournament.entryType = :type', { type: BracketEntryType.TEAM })
      .andWhere('tournament.id = :id', { id });
    const res = await query.getMany();
    return res.map(t => t.team);
  }
}
