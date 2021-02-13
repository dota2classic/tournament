import { Injectable, NotFoundException } from '@nestjs/common';

import { Connection, Repository } from 'typeorm';

import { BracketsManager } from 'brackets-manager';
import { InputStage, Status } from 'brackets-model';
import {
  BestOfStrategy,
  TournamentEntity,
} from '../../db/entity/tournament.entity';
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
import {
  FullTournamentDto,
  TournamentDto,
  TournamentStandingDto,
} from '../../rest/dto/tournament.dto';

import { TeamMapper } from '../../rest/mapper/team.mapper';
import { UtilQuery } from './util-query';
import { RoundEntity } from '../../db/entity/round.entity';
import { MatchGameEntity } from '../../db/entity/match-game.entity';
import { EventBus } from '@nestjs/cqrs';
import { BracketUpdatedEvent } from '../../rest/event/bracket-updated.event';
import { TeamMemberEntity } from '../../db/entity/team-member.entity';
import { TeamService } from './team.service';

export type EntryIdType = string;

@Injectable()
export class BracketService {
  private tournamentEntityRepository: Repository<TournamentEntity>;

  constructor(
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
    @InjectRepository(RoundEntity)
    private readonly roundEntityRepository: Repository<RoundEntity>,
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
    private readonly ebus: EventBus,
    private readonly manager: BracketsManager,
    private readonly teamService: TeamService,
  ) {
    this.tournamentEntityRepository = connection.getRepository(
      TournamentEntity,
    );
  }

  static formatToPower<T>(arr: any[]): T[] {
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
      settings: {
        // seedOrdering: ['natural', 'natural', 'natural'],
        grandFinal: 'simple',
      },
    };

    await this.manager.create(stageSetup);

    tournament.status = TournamentStatus.ONGOING;
    // just to sync things up.
    tournament.startDate = new Date();

    await this.tournamentEntityRepository.save(tournament);

    // ok here we need to find all

    const allMatches = await this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .leftJoin(StageEntity, 'stage', 'stage.id = bm.stage_id')
      .where('stage.tournament_id = :tId', { tId })
      .orderBy('bm.id', 'ASC')
      .getMany();

    await Promise.all(
      allMatches.map(async m => this.bmService.generateGames(tId, m.id)),
    );

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
    bestOfStrategy: BestOfStrategy = { round: 1, final: 1, grandFinal: 1 },
  ) {
    const t = new TournamentEntity();
    t.name = name;
    t.entryType = type;
    t.startDate = new Date(startDate);
    t.imageUrl = imageUrl;
    t.strategy = strategy;
    t.bestOfConfig = bestOfStrategy;
    return await this.tournamentEntityRepository.save(t);
  }

  // public async matchResults(matchId: number, winnerOpponentId: number) {
  //   const m: BracketMatchEntity = await this.stor.select('match', matchId);
  //
  //   let winnerOpponent: ParticipantResult | undefined;
  //   if (m.opponent1?.id === winnerOpponentId) {
  //     winnerOpponent = m.opponent1;
  //   } else if (m.opponent2?.id === winnerOpponentId) {
  //     winnerOpponent = m.opponent2;
  //   }
  //
  //   if (!winnerOpponent) return;
  //
  //   if (
  //     m.opponent1?.id === winnerOpponent.id ||
  //     m.opponent2?.id === winnerOpponent.id
  //   ) {
  //     if (m.opponent1?.id === winnerOpponent.id) {
  //       m.opponent1.result = 'win';
  //     } else {
  //       m.opponent2.result = 'win';
  //     }
  //
  //     await this.manager.update.match({
  //       id: m.id,
  //       opponent1: m.opponent1,
  //       opponent2: m.opponent2,
  //     });
  //   } else {
  //     throw 'pepe';
  //   }
  //
  //   this.ebus.publish(
  //     new BracketUpdatedEvent(
  //       await this.utilQuery.matchTournamentId(matchId),
  //       matchId,
  //     ),
  //   );
  // }

  public async registerTeamByPlayer(tId: number, steamId: string) {
    const team = await this.teamService.findTeamOf(steamId);

    console.log(team);
    if (!team) throw new NotFoundException();

    const t = await this.tournamentEntityRepository.findOne(tId);
    if (!t) throw new NotFoundException();

    if (t.entryType !== BracketEntryType.TEAM) throw new NotFoundException();

    // TODO: manage conflicting members?

    if (team.members.length !== 5) {
      // not full;
      return;
    }

    const existingParticipation =await this.tournamentParticipantEntityRepository.findOne({
      tournament_id: t.id,
      name: team.id
    });

    if(existingParticipation) return;

    const b = new TournamentParticipantEntity();
    b.tournament_id = t.id;
    b.name = team.id;
    await this.tournamentParticipantEntityRepository.save(b);

    // lock team so members dont change
    team.locked = true;
    await this.teamEntityRepository.save(team);
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

  public async leaveTournamentAsPlayer(tId: number, steam_id: string) {
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

  public async leaveTournamentAsTeam(tId: number, steamId: string) {
    const team = await this.teamEntityRepository
      .createQueryBuilder('t')
      .innerJoin(TeamMemberEntity, 'mem', 'mem.teamId = t.id')
      .where('mem.steam_id = :steamId', { steamId })
      .getOne();

    if (!team) throw new NotFoundException();

    const t = await this.tournamentEntityRepository.findOne(tId);
    if (!t) throw new NotFoundException();

    if (t.entryType !== BracketEntryType.TEAM) throw new NotFoundException();

    const participation = await this.tournamentParticipantEntityRepository.findOne(
      {
        name: team.id,
        tournament_id: tId,
      },
    );

    if (!participation) return;

    await this.tournamentParticipantEntityRepository.delete(participation);
    team.locked = false;
    await this.teamEntityRepository.save(team);
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

    // ok here we need to compute standings

    if (t.entryType === BracketEntryType.PLAYER) {
      // players

      return {
        ...t,
        startDate: t.startDate.getTime(),
        participants: t.preParticipants.map(t => ({
          steam_id: t.name,
        })),
        standings:
          (t.status === TournamentStatus.FINISHED &&
            (await this.getStandings(t.id))) ||
          undefined,
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
        standings:
          (t.status === TournamentStatus.FINISHED &&
            (await this.getStandings(t.id))) ||
          undefined,
      };
    }
  }

  public async cancelTournament(tId: number) {
    const tournament = await this.tournamentEntityRepository.findOne(tId);
    if (!tournament) return;

    tournament.status = TournamentStatus.CANCELLED;
    await this.tournamentEntityRepository.save(tournament);

    const allGames = await this.matchGameEntityRepository
      .createQueryBuilder('mg')
      .innerJoin(BracketMatchEntity, 'bm', 'bm.id = mg.bm_id')
      .leftJoin(StageEntity, 'stage', 'stage.id = bm.stage_id')
      .where('stage.tournament_id = :tId', { tId })
      .getMany();

    await Promise.all(
      allGames.map(async m =>
        this.bmService.cancelMatchSchedule(tId, m.bm_id, m.id),
      ),
    );

    await this.unlockTeams(tournament.id);
  }

  /**
   * Technical lose for given id
   * @param gameId - gameId
   * @param mId - matchID
   * @param forfeitId - teamID or steamID
   */
  public async forfeit(gameId: number, mId: number, forfeitId: string) {
    const m = await this.bracketMatchEntityRepository.findOne(mId);
    const game = await this.matchGameEntityRepository.findOne(gameId);

    const opp1 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent1?.id,
    );
    const opp2 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent2?.id,
    );

    game.winner = opp1.name === forfeitId ? opp2.id : opp1.id;
    game.finished = true;
    await this.matchGameEntityRepository.save(game);

    if (opp1.name === forfeitId) {
      await this.manager.update.match({
        id: m.id,
        opponent1: {
          id: opp1.id,
          score: m.opponent1.score || 0,
        },
        opponent2: {
          score: m.opponent1.score + 1,
          id: opp2.id,
        },
      });
    } else if (opp2.name === forfeitId) {
      await this.manager.update.match({
        id: m.id,
        opponent2: {
          id: opp2.id,
          score: m.opponent2.score || 0,
        },
        opponent1: {
          id: opp1.id,
          score: m.opponent1.score + 1,
        },
      });
    }

    const t = await this.utilQuery.matchTournamentId(m.id);

    await this.bmService.cancelMatchSchedule(gameId, t, m.id);

    this.ebus.publish(new BracketUpdatedEvent(t, m.id, gameId));

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

      // here we unlock teams
      await this.unlockTeams(tournament.id);

      return true;
    }

    return false;
  }

  private async unlockTeams(tournamentId: number) {
    const t = await this.tournamentEntityRepository.findOne(tournamentId);
    if (!t) return;
    if (t.entryType === BracketEntryType.PLAYER) return;

    const parts = await this.tournamentParticipantEntityRepository.find({
      tournament_id: tournamentId,
    });
    const unlocker = parts.map(async part => {
      const team = await this.teamEntityRepository.findOne(part.name);
      team.locked = false;
      await this.teamEntityRepository.save(team);
    });
    await Promise.all(unlocker);
  }

  public async checkMatchResults(mId: number) {
    const matchGames = await this.matchGameEntityRepository.find({
      bm_id: mId,
    });

    // ok it's done

    const scores: {
      [key: string]: number;
    } = {};

    for (const mg of matchGames) {
      scores[mg.winner] = (scores[mg.winner] || 0) + 1;
    }

    const m = await this.bracketMatchEntityRepository.findOne(mId);

    const opp1 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent1?.id,
    );
    const opp2 = await this.bracketParticipantEntityRepository.findOne(
      m.opponent2?.id,
    );

    scores[opp1.id] = scores[opp1.id] || 0;
    scores[opp2.id] = scores[opp2.id] || 0;

    // more than half
    const scoreToWin = Math.ceil(matchGames.length / 2);

    const unfinishedGames = matchGames.filter(t => !t.winner);
    if (unfinishedGames.length > 0) {
      const t = await this.utilQuery.matchTournamentId(m.id);
      // find case where 2 - 0 in bo3 for e.g.

      if (scores[opp1.id] >= scoreToWin) {
        await this.manager.update.match({
          id: m.id,
          opponent1: {
            id: opp1.id,
            score: scores[opp1.id],
            result: 'win',
          },
          opponent2: {
            id: opp2.id,
            score: scores[opp2.id] || 0,
            result: 'loss',
          },
        });
        // we need to unschedule all unfinished games - we already have result for match
        await Promise.all(
          unfinishedGames.map(async game => {
            game.finished = true;
            await this.matchGameEntityRepository.save(game);
            await this.bmService.cancelMatchSchedule(t, m.id, game.id);
          }),
        );
      } else if (scores[opp2.id] >= scoreToWin) {
        await this.manager.update.match({
          id: m.id,
          opponent1: {
            id: opp1.id,
            score: scores[opp1.id],
            result: 'loss',
          },
          opponent2: {
            id: opp2.id,
            score: scores[opp2.id] || 0,
            result: 'win',
          },
        });
        // we need to unschedule all unfinished games - we already have result for match
        await Promise.all(
          unfinishedGames.map(async game => {
            game.finished = true;
            await this.matchGameEntityRepository.save(game);
            await this.bmService.cancelMatchSchedule(t, m.id, game.id);
          }),
        );
      } else {
        return;
      }

      return;
    }

    await this.manager.update.match({
      id: m.id,
      opponent1: {
        id: opp1.id,
        score: scores[opp1.id],
        result: scores[opp1.id] > scores[opp2.id] ? 'win' : 'loss',
      },
      opponent2: {
        id: opp2.id,
        score: scores[opp2.id] || 0,
        result: scores[opp1.id] > scores[opp2.id] ? 'loss' : 'win',
      },
    });
  }

  public async getStandings(tId: number): Promise<TournamentStandingDto[]> {
    const entry = await this.tournamentEntityRepository
      .findOne(tId)
      .then(t => t.entryType);
    const [rounds, count] = await this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .innerJoin(StageEntity, 'stage', 'bm.stage_id = stage.id')
      .innerJoin(RoundEntity, 'round', 'bm.round_id = round.id')
      .where('stage.tournament_id = :tId', { tId })
      .orderBy('round.number', 'DESC')
      .getManyAndCount();

    const opponents = rounds.flatMap(a =>
      [a.opponent1, a.opponent2].filter(Boolean),
    ); //.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

    const oppsWithScores = opponents.map(opp => {
      return {
        id: opp.id,
        score: opp.forfeit ? 0 : opp.result === 'loss' ? 0 : 1,
      };
    });

    const shit: {
      [key: number]: { id: number; score: number };
    } = {};

    oppsWithScores.forEach(opp => {
      if (opp.id in shit) {
        shit[opp.id].score += opp.score;
      } else shit[opp.id] = opp;
    });

    const groupedByScore: {
      [key: number]: { id: number; score: number }[];
    } = {};

    Object.values(shit).forEach(opp => {
      if (opp.score in groupedByScore) {
        groupedByScore[opp.score].push(opp);
      } else groupedByScore[opp.score] = [opp];
    });

    const standings: { id: number; place: number }[] = [];

    const placeDetect = Object.keys(groupedByScore)
      .map(Number)
      .sort((a, b) => b - a);

    Object.entries(groupedByScore)
      .sort((a, b) => +b[0] - +a[0])
      .forEach(([score, opps]) => {
        opps.forEach(opp => {
          standings.push({
            id: opp.id,
            place: placeDetect.indexOf(opp.score) + 1,
          });
        });
      });

    switch (entry) {
      case BracketEntryType.PLAYER:
        return Promise.all(
          standings.map(async a => {
            const part = await this.bracketParticipantEntityRepository.findOne(
              a.id,
            );
            return {
              steam_id: part.name,
              position: a.place,
            };
          }),
        );
      case BracketEntryType.TEAM:
        return Promise.all(
          standings.map(async a => {
            const part = await this.bracketParticipantEntityRepository.findOne(
              a.id,
            );
            const team = await this.teamEntityRepository.findOne(part.name, {
              relations: ['members'],
            });
            return {
              team: await this.mapper.mapTeam(team),
              position: a.place,
            };
          }),
        );
    }
  }
}
