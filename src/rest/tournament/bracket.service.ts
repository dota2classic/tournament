import { Injectable, NotFoundException } from '@nestjs/common';

import { Connection, Repository } from 'typeorm';

import { BracketsManager } from 'brackets-manager';
import { InputStage, ParticipantResult, Status } from 'brackets-model';
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
import { BracketMatchService } from './bracket-match.service';
import { StageEntity } from '../../db/entity/stage.entity';
import { FullTournamentDto, TournamentDto } from '../dto/tournament.dto';
import { TeamMapper } from '../mapper/team.mapper';
import { UtilQuery } from '../../tournament/service/util-query';

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
    private readonly bmService: BracketMatchService,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    private readonly mapper: TeamMapper,
    private readonly utilQuery: UtilQuery,
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

    // it's just stupid to do this right
    if (entries.length < Math.pow(2, 2)) return;

    const stageSetup: InputStage = {
      name: 'Example',
      tournamentId: tId,
      type:
        tournament.strategy === BracketType.DOUBLE_ELIMINATION
          ? 'double_elimination'
          : 'single_elimination',
      seeding: BracketService.formatToPower(entries),
      settings: { seedOrdering: ['inner_outer'], grandFinal: 'simple' },
    };

    console.log(`Hello 0`, tournament);

    await this.manager.create(stageSetup);

    tournament.status = TournamentStatus.ONGOING;
    // just to sync things up.
    tournament.startDate = new Date();

    console.log(`Hello`, tournament);

    await this.tournamentEntityRepository.save(tournament);

    console.log(`Hello 2`, tournament);
    // ok here we need to find all

    const allMatches = await this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .leftJoin(StageEntity, 'stage', 'stage.id = bm.stage_id')
      .where('stage.tournament_id = :tId', { tId })
      .getMany();

    await Promise.all(
      allMatches.map(async m => this.bmService.scheduleBracketMatch(tId, m.id)),
    );
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

  public async matchResults(matchId: number, winnerOpponentId: number) {
    const m: BracketMatchEntity = await this.stor.select('match', matchId);

    let winnerOpponent: ParticipantResult | undefined;
    if (m.opponent1?.id === winnerOpponentId) {
      winnerOpponent = m.opponent1;
    } else if (m.opponent2?.id === winnerOpponentId) {
      winnerOpponent = m.opponent2;
    }

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

    await this.checkForTournamentFinish(
      await this.utilQuery.matchTournamentId(matchId),
    );
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

    if (t.status !== TournamentStatus.NEW) return;

    const participation = await this.tournamentParticipantEntityRepository.findOne(
      {
        name: steam_id,
        tournament_id: tId,
      },
    );

    // already in
    if (participation) return;

    const b = new TournamentParticipantEntity();
    b.tournament_id = t.id;
    b.name = steam_id;
    await this.tournamentParticipantEntityRepository.save(b);
  }

  public async leaveSoloPlayer(tId: number, steam_id: string) {
    const t = await this.tournamentEntityRepository.findOne(tId);
    if (!t) throw new NotFoundException();

    if (t.entryType !== BracketEntryType.PLAYER) throw new NotFoundException();

    if (t.status !== TournamentStatus.NEW) throw new NotFoundException();

    const participation = await this.tournamentParticipantEntityRepository.findOne(
      {
        name: steam_id,
        tournament_id: tId,
      },
    );

    if (!participation) return;

    await this.tournamentParticipantEntityRepository.delete(participation);
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

  public async fullTournament(id: number): Promise<FullTournamentDto> {
    const t = await this.tournamentEntityRepository.findOne(id, {
      relations: ['preParticipants'],
    });

    if (t.entryType === BracketEntryType.PLAYER) {
      // players

      return {
        ...t,
        startDate: t.startDate.getTime(),
        participants: t.preParticipants.map(t => ({
          steam_id: t.name,
        })),
      };
    } else {
      const teams = await this.teamEntityRepository.findByIds(
        t.preParticipants.map(t => t.name),
        { relations: ['members'] },
      );
      return {
        ...t,
        startDate: t.startDate.getTime(),
        participants: teams.map(t => ({
          team: this.mapper.mapTeam(t),
        })),
      };
    }
  }

  public async cancelTournament(tId: number) {
    const tournament = await this.tournamentEntityRepository.findOne(tId);
    if (!tournament) return;

    tournament.status = TournamentStatus.CANCELLED;
    await this.tournamentEntityRepository.save(tournament);

    const allMatches = await this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .leftJoin(StageEntity, 'stage', 'stage.id = bm.stage_id')
      .where('stage.tournament_id = :tId', { tId })
      .getMany();

    await Promise.all(
      allMatches.map(async m => this.bmService.cancelMatchSchedule(tId, m.id)),
    );
  }

  /**
   * Technical lose for given id
   * @param mId - matchID
   * @param forfeitId - teamID or steamID
   */
  public async forfeit(mId: number, forfeitId: string) {
    const m = await this.bracketMatchEntityRepository.findOne(mId);
    const opp1 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent1?.id,
    );
    const opp2 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent2?.id,
    );

    if (opp1.name === forfeitId) {
      await this.manager.update.match({
        id: m.id,
        opponent1: {
          id: opp1.id,
          forfeit: true,
        },
      });
    } else if (opp2.name === forfeitId) {
      await this.manager.update.match({
        id: m.id,
        opponent2: {
          id: opp2.id,
          forfeit: true,
        },
      });
    }

    const t = await this.utilQuery.matchTournamentId(m.id);
    await this.checkForTournamentFinish(t);

    return this.bracketMatchEntityRepository.findOne(m.id);
  }

  public async findTournamentByMatchId(mid: number): Promise<TournamentDto> {
    const query = this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .where('bm.id = :id', { id: mid })
      .leftJoinAndMapOne(
        'bm.stage',
        StageEntity,
        'stage',
        'stage.id = bm.stage_id',
      );
    const match = await query.getOne();
    if (match.stage?.tournament_id) {
      return this.fullTournament(match.stage?.tournament_id);
    }
  }

  public async checkForTournamentFinish(tId: number) {
    const tournament = await this.tournamentEntityRepository.findOne(tId);

    if (!tournament) return false;

    if (tournament.status === TournamentStatus.NEW) return false;
    if (tournament.status === TournamentStatus.CANCELLED) return true;
    if (tournament.status === TournamentStatus.FINISHED) return true;

    const matches = await this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .leftJoinAndMapOne(
        'bm.stage',
        StageEntity,
        'stage',
        'stage.id = bm.stage_id',
      )
      .where('stage.tournament_id = :tId', { tId })
      .andWhere('bm.status not in (:...statuses)', {
        statuses: [Status.Completed, Status.Archived],
      })
      .getCount();

    if (matches === 0) {
      tournament.status = TournamentStatus.FINISHED;
      await this.tournamentEntityRepository.save(tournament);
      return true;
    }

    return false;
  }

  public async setWinner(mId: number, winnerId: string) {
    const m = await this.bracketMatchEntityRepository.findOne(mId);
    const opp1 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent1?.id,
    );
    const opp2 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent2?.id,
    );

    if (opp1.name === winnerId) {
      await this.manager.update.match({
        id: m.id,
        opponent1: {
          id: opp1.id,
          result: 'win',
        },
      });
    } else if (opp2.name === winnerId) {
      await this.manager.update.match({
        id: m.id,
        opponent2: {
          id: opp2.id,
          result: 'win',
        },
      });
    }

    const t = await this.utilQuery.matchTournamentId(m.id);
    await this.checkForTournamentFinish(t);
    return this.bracketMatchEntityRepository.findOne(m.id);
  }
}
