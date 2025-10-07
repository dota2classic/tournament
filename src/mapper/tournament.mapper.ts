import { Injectable } from '@nestjs/common';
import { BracketCrud, TournamentBracketInfo } from '../service/bracket.crud';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import {
  BracketDto,
  BracketRoundDto,
  MatchGameDto,
  SeedItemDto,
  TournamentDto,
  TournamentMatchDto,
} from '../model/tournament.dto';
import { TeamEntity } from '../db/entity/team.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMapper } from './team.mapper';
import { RoundEntity } from '../db/entity/round.entity';
import { ParticipantResult } from 'brackets-model';
import { MatchGameEntity } from '../db/entity/match-game.entity';

@Injectable()
export class TournamentMapper {
  constructor(
    private readonly crud: BracketCrud,
    @InjectRepository(TeamEntity)
    private readonly teamEntityRepository: Repository<TeamEntity>,
    private readonly teamMapper: TeamMapper,
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
  ) {}

  public mapTournament = (t: TournamentEntity): TournamentDto => {
    return {
      id: t.id,
      name: t.name,
      status: t.state,
      version: t.version,
      imageUrl: t.imageUrl,
      description: t.description,
      startDate: t.startDate.getTime(),
    };
  };

  private mapSeed = async (
    opp: ParticipantResult,
  ): Promise<SeedItemDto> => {
    throw 'TODO IMPLEMENT';
    // if (!opp) return null;
    // if (!opp.id)
    //   return {
    //     steam_id: null,
    //     tbd: true,
    //   };
    // const rr = await this.crud.select<BracketParticipantEntity>(
    //   'participant',
    //   opp.id,
    // );
    //
    // switch (entryType) {
    //   case BracketEntryType.PLAYER:
    //     return {
    //       steam_id: rr.name,
    //       result: opp.result,
    //       score: opp.score,
    //     };
    //   case BracketEntryType.TEAM:
    //     return {
    //       result: opp.result,
    //       team: await this.teamEntityRepository
    //         .findOne({ where: { id: rr.name }, relations: ['members'] })
    //         .then(this.teamMapper.mapTeam),
    //
    //       score: opp.score,
    //     };
    // }
  };

  private async mapRound(
    round: RoundEntity,
  ): Promise<BracketRoundDto> {
    throw 'TODO IMPLEMENT';
    // const seeds = await this.crud.select<BracketMatchEntity>('match', {
    //   round_id: round.id,
    // });
    // seeds.sort((a, b) => a.number - b.number);
    //
    // return {
    //   title: `Round ${round.number}`,
    //   round: round.number,
    //
    //   seeds: await Promise.all(
    //     seeds.map(async match => {
    //       const games = await this.matchGameEntityRepository.find({
    //         where: {
    //           bm_id: match.id,
    //         },
    //       });
    //
    //       const teams = await Promise.all(
    //         [match.opponent1, match.opponent2].map(async opp => {
    //           if (!opp) return null;
    //           if (!opp.id)
    //             return {
    //               name: null,
    //               steam_id: null,
    //               tbd: true,
    //             };
    //           const rr = await this.crud.select<BracketParticipantEntity>(
    //             'participant',
    //             opp.id,
    //           );
    //
    //           switch (entryType) {
    //             case BracketEntryType.PLAYER:
    //               return {
    //                 name: rr.name,
    //                 steam_id: rr.name,
    //                 score: opp.score,
    //                 result: opp.result,
    //               };
    //             case BracketEntryType.TEAM:
    //               return {
    //                 name: rr.name,
    //                 result: opp.result,
    //                 score: opp.score,
    //                 team: await this.teamEntityRepository
    //                   .findOne({
    //                     where: { id: rr.name },
    //                     relations: ['members'],
    //                   })
    //                   .then(this.teamMapper.mapTeam),
    //               };
    //           }
    //         }),
    //       );
    //
    //       return {
    //         id: match.id,
    //         teams,
    //         games: games.map(this.mapTournamentMatchGame),
    //       };
    //     }),
    //   ),
    // };
  }

  public mapBracket = async (
    bracket: TournamentBracketInfo,
    tournament: TournamentEntity,
  ): Promise<BracketDto> => {
    throw 'TODO IMPLEMENT';
    // if (tournament.strategy === BracketType.DOUBLE_ELIMINATION) {
    //   // it should have loser bracket
    //   // now we need to split loser and winner bracket matches
    //
    //   const roundsByGroup = splitBy(bracket.round, 'group_id');
    //
    //   const [winner, loser, grandFinal] = Object.keys(roundsByGroup);
    //
    //   return {
    //     type: tournament.strategy,
    //     winning: await Promise.all(
    //       roundsByGroup[winner]
    //         .concat(roundsByGroup[grandFinal])
    //         .map(async round => this.mapRound(tournament.entryType, round)),
    //     ),
    //     losing: await Promise.all(
    //       roundsByGroup[loser].map(async round =>
    //         this.mapRound(tournament.entryType, round),
    //       ),
    //     ),
    //   };
    // } else {
    //   // no loser bracket
    //   return {
    //     type: tournament.strategy,
    //     winning: await Promise.all(
    //       bracket.round.map(async round =>
    //         this.mapRound(tournament.entryType, round),
    //       ),
    //     ),
    //     losing: [],
    //   };
    // }
  };

  private mapTournamentMatchGame = (game: MatchGameEntity): MatchGameDto => {
    return {
      gameId: game.id,
      bracketMatchId: game.bm_id,
      externalMatchId: game.externalMatchId,
      scheduledDate: game.scheduledDate?.getTime(),
      teamOffset: game.teamOffset,
      number: game.number,
    };
  };
  async mapTournamentMatch(
    m: BracketMatchEntity,
  ): Promise<TournamentMatchDto> {
    throw 'TODO IMPLEMENT';
    // let ms: MatchStatus;
    //
    // const games = await this.matchGameEntityRepository.find({
    //   where: {
    //     bm_id: m.id,
    //   },
    //   order: {
    //     number: 'ASC',
    //   },
    // });
    //
    // switch (m.status) {
    //   case Status.Locked:
    //     ms = MatchStatus.Locked;
    //     break;
    //   case Status.Waiting:
    //     ms = MatchStatus.Waiting;
    //     break;
    //   case Status.Ready:
    //     ms = MatchStatus.Ready;
    //     break;
    //   case Status.Running:
    //     ms = MatchStatus.Running;
    //     break;
    //   case Status.Completed:
    //     ms = MatchStatus.Completed;
    //     break;
    //   case Status.Archived:
    //     ms = MatchStatus.Archived;
    //     break;
    // }
    // return {
    //   ...m,
    //   games: games.map(this.mapTournamentMatchGame),
    //   opponent1: m.opponent1 && (await this.mapSeed(type, m.opponent1)),
    //   opponent2: m.opponent2 && (await this.mapSeed(type, m.opponent2)),
    //   status: ms,
    // };
  }
}
