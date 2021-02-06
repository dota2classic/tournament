import { Injectable } from '@nestjs/common';
import { BracketCrud, TournamentBracketInfo } from '../tournament/bracket.crud';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { BracketParticipantEntity } from '../../db/entity/bracket-participant.entity';
import { TournamentEntity } from '../../db/entity/tournament.entity';
import { BracketDto, TournamentDto } from '../dto/tournament.dto';
import {
  BracketEntryType,
  BracketType,
} from '../../gateway/shared-types/tournament';
import { TeamEntity } from '../../db/entity/team.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMapper } from './team.mapper';
import { splitBy } from '../../util/splitBy';
import { RoundEntity } from '../../db/entity/round.entity';

@Injectable()
export class TournamentMapper {
  constructor(
    private readonly crud: BracketCrud,
    @InjectRepository(TeamEntity)
    private readonly teamEntityRepository: Repository<TeamEntity>,
    private readonly teamMapper: TeamMapper,
  ) {}

  public mapTournament = (t: TournamentEntity): TournamentDto => {
    return {
      ...t,
      startDate: t.startDate.getTime(),
    };
  };

  private async mapRound(entryType: BracketEntryType, round: RoundEntity) {
    const seeds = await this.crud.select<BracketMatchEntity>('match', {
      round_id: round.id,
    });
    seeds.sort((a, b) => a.number - b.number);
    return {
      title: `Round ${round.number}`,
      round: round.number,

      seeds: await Promise.all(
        seeds.map(async match => {
          const teams = await Promise.all(
            [match.opponent1, match.opponent2].map(async opp => {
              if (!opp) return null;
              if (!opp.id)
                return {
                  name: null,
                  steam_id: null,
                  tbd: true,
                };
              const rr = await this.crud.select<BracketParticipantEntity>(
                'participant',
                opp.id,
              );

              switch (entryType) {
                case BracketEntryType.PLAYER:
                  return {
                    name: rr.name,
                    steam_id: rr.name,
                    result: opp.result,
                  };
                case BracketEntryType.TEAM:
                  return {
                    name: rr.name,
                    result: opp.result,
                    team: await this.teamEntityRepository
                      .findOne(rr.name, { relations: ['members'] })
                      .then(this.teamMapper.mapTeam),
                  };
              }
            }),
          );

          return {
            id: match.id,
            date: new Date().toDateString(),
            teams,
          };
        }),
      ),
    };
  }
  public mapBracket = async (
    bracket: TournamentBracketInfo,
    tournament: TournamentEntity,
  ): Promise<BracketDto> => {
    if (tournament.strategy === BracketType.DOUBLE_ELIMINATION) {
      // it should have loser bracket
      // now we need to split loser and winner bracket matches

      const roundsByGroup = splitBy(bracket.round, 'group_id');

      const [winner, loser, grandFinal] = Object.keys(roundsByGroup);

      return {
        type: tournament.strategy,
        winning: await Promise.all(
          roundsByGroup[winner]
            .concat(roundsByGroup[grandFinal])
            .map(async round => this.mapRound(tournament.entryType, round)),
        ),
        losing: await Promise.all(
          roundsByGroup[loser].map(async round =>
            this.mapRound(tournament.entryType, round),
          ),
        ),
      };
    } else {
      // no loser bracket
      return {
        type: tournament.strategy,
        winning: await Promise.all(
          bracket.round.map(async round => {
            const seeds = await this.crud.select<BracketMatchEntity>('match', {
              round_id: round.id,
            });
            seeds.sort((a, b) => a.number - b.number);
            return {
              title: `Round ${round.number}`,
              round: round.number,

              seeds: await Promise.all(
                seeds.map(async match => {
                  const teams = await Promise.all(
                    [match.opponent1, match.opponent2].map(async opp => {
                      if (!opp) return null;
                      if (!opp.id)
                        return {
                          name: null,
                          steam_id: null,
                          tbd: true,
                        };
                      const rr = await this.crud.select<
                        BracketParticipantEntity
                      >('participant', opp.id);

                      switch (tournament.entryType) {
                        case BracketEntryType.PLAYER:
                          return {
                            name: rr.name,
                            steam_id: rr.name,
                            result: opp.result,
                          };
                        case BracketEntryType.TEAM:
                          return {
                            name: rr.name,
                            result: opp.result,
                            team: await this.teamEntityRepository
                              .findOne(rr.name, { relations: ['members'] })
                              .then(this.teamMapper.mapTeam),
                          };
                      }
                    }),
                  );

                  return {
                    id: match.id,
                    date: new Date().toDateString(),
                    teams,
                  };
                }),
              ),
            };
          }),
        ),
        losing: [],
      };
    }
  };
}
