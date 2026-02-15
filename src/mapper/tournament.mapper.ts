import { Injectable } from '@nestjs/common';
import { BracketCrud, TournamentBracketInfo } from '../service/bracket.crud';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import {
  BracketDto,
  BracketRoundDto,
  MatchGameDto,
  RegistrationDto,
  RegistrationInvitationDto,
  SeedDto,
  SeedItemDto,
  TournamentDto,
} from '../model/tournament.dto';
import { TeamEntity } from '../db/entity/team.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMapper } from './team.mapper';
import { RoundEntity } from '../db/entity/round.entity';
import { ParticipantResult } from 'brackets-model';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { BracketType } from '../gateway/shared-types/tournament';
import { splitBy } from '../util/splitBy';
import { ParticipantEntity } from '../db/entity/participant.entity';
import { RegistrationInvitationEntity } from '../db/entity/registration-invitation.entity';

@Injectable()
export class TournamentMapper {
  constructor(
    private readonly crud: BracketCrud,
    @InjectRepository(TeamEntity)
    private readonly teamEntityRepository: Repository<TeamEntity>,
    private readonly teamMapper: TeamMapper,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<BracketMatchGameEntity>,
  ) {}

  public mapTournament = (t: TournamentEntity): TournamentDto => {
    return {
      id: t.id,
      name: t.name,
      imageUrl: t.imageUrl,
      teamSize: t.teamSize,
      status: t.state,
      strategy: t.strategy,
      bestOfStrategy: t.bestOfConfig,
      gameMode: t.gameMode,
      prize: t.prize,

      description: t.description,
      startDate: t.startDate.toISOString(),
      registrations: t.registrations
        .filter((t) => t.players.length > 0)
        .map(this.mapRegistration),
      scheduleStrategy: t.scheduleStrategy,
    };
  };

  public mapRegistration = (
    t: TournamentRegistrationEntity,
  ): RegistrationDto => {
    return {
      id: t.id,
      state: t.state,
      players: t.players.map((t) => ({
        steamId: t.steamId,
        state: t.state,
      })),
    };
  };

  private mapSeedItem = async (
    opp: ParticipantResult,
  ): Promise<SeedItemDto> => {
    const rr = await this.crud.select<ParticipantEntity>('participant', opp.id);

    if (!rr) return null;
    if (!rr.id)
      return {
        id: Number(opp.id),
        players: [],
        tbd: true,
      };

    return {
      id: Number(opp.id),
      players: rr.players.map((t) => t.steamId),
      score: opp.score,
      result: opp.result,
    };
  };

  private mapSeed = async (match: BracketMatchEntity): Promise<SeedDto> => {
    const games = await this.matchGameEntityRepository.find({
      where: {
        parent_id: match.id,
      },
    });

    const teams = await Promise.all(
      [match.opponent1, match.opponent2].map(this.mapSeedItem),
    );

    return {
      teams,
      games: await Promise.all(games.map(this.mapTournamentMatchGame)),
      ch: match.child_count,
      id: match.id,
      scheduledDate: match.scheduledDate.toISOString(),
      number: match.number,
      status: match.status,
    };
  };

  private mapRound = async (round: RoundEntity): Promise<BracketRoundDto> => {
    const seeds = await this.crud.select<BracketMatchEntity>('match', {
      round_id: round.id,
    });
    seeds.sort((a, b) => a.number - b.number);

    return {
      title: `Round ${round.number}`,
      round: round.number,

      seeds: await Promise.all(seeds.map(this.mapSeed)),
    };
  };

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
            .map(this.mapRound),
        ),
        losing: await Promise.all(roundsByGroup[loser].map(this.mapRound)),
      };
    } else {
      // no loser bracket
      return {
        type: tournament.strategy,
        winning: await Promise.all(bracket.round.map(this.mapRound)),
        losing: [],
      };
    }
  };

  private mapTournamentMatchGame = async (
    game: BracketMatchGameEntity,
  ): Promise<MatchGameDto> => {
    return {
      gameId: game.id,
      bracketMatchId: game.parent_id,
      externalMatchId: game.externalMatchId,
      scheduledDate: game.scheduledDate.toISOString(),
      teamOffset: game.teamOffset,
      number: game.number,
      status: game.status,
      opponent1: game.opponent1 && (await this.mapSeedItem(game.opponent1)),
      opponent2: game.opponent2 && (await this.mapSeedItem(game.opponent2)),
    };
  };

  mapInvitation = (
    inv: RegistrationInvitationEntity,
  ): RegistrationInvitationDto => {
    return {
      id: inv.id,
      inviterSteamId: inv.inviterSteamId,
      steamId: inv.steamId,
      tournament: {
        id: inv.tournament.id,
        name: inv.tournament.name,
      },
    };
  };
}
