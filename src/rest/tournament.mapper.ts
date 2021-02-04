import { Injectable } from '@nestjs/common';
import { BracketCrud, TournamentBracketInfo } from './tournament/bracket.crud';
import { UserRepository } from './caches/user.repository';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { BracketParticipantEntity } from '../db/entity/bracket-participant.entity';

export interface RenderBracket {}
@Injectable()
export class TournamentMapper {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly crud: BracketCrud,
  ) {}

  public mapBracket = async (
    bracket: TournamentBracketInfo,
  ): Promise<RenderBracket[]> => {
    return await Promise.all(
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
                  const rr = await this.crud.select<BracketParticipantEntity>(
                    'participant',
                    opp.id,
                  );

                  return {
                    name: await this.userRepository.name(rr.name),
                    steam_id: rr.name,
                    result: opp.result,
                  };
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
    );
  };

  public mapBracket2 = async (
    bracket: TournamentBracketInfo,
  ): Promise<TournamentBracketInfo> => {
    return {
      ...bracket,
      participant: await Promise.all(
        bracket.participant.map(async p => ({
          ...p,
          name: await this.userRepository.name(p.name),
        })),
      ),
    };
  };
}
