import { Injectable } from '@nestjs/common';
import { BracketCrud, TournamentBracketInfo } from '../service/bracket.crud';
import {
  BracketMatchDto,
  BracketMatchGameDto,
  BracketParticipantDto,
  OpponentDto,
  ParticipantResultDto,
  RoundDto,
  TournamentBracketInfoDto,
} from '../model/bracket.dto';
import { ParticipantEntity } from '../db/entity/participant.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TeamMapper } from './team.mapper';
import { TeamEntity } from '../db/entity/team.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { ParticipantResult, Status } from 'brackets-model';

@Injectable()
export class BracketMapper {
  constructor(
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamEntityRepository: Repository<TeamEntity>,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<
      BracketMatchGameEntity
    >,
    private readonly teamMapper: TeamMapper,
    private readonly crud: BracketCrud,
  ) {}

  public mapMatch = async (m: BracketMatchEntity): Promise<BracketMatchDto> => {
    const games = await this.matchGameEntityRepository.find({
      where: {
        parent_id: m.id,
      },
      order: {
        number: 'ASC',
      },
    });
    return {
      id: m.id,
      stage_id: m.stage_id,
      group_id: m.group_id,
      round_id: m.round_id,
      child_count: m.child_count,
      number: m.number,
      status: m.status,
      opponent1: m.opponent1 && (await this.mapOpponent(m.opponent1)),
      opponent2: m.opponent2 && (await this.mapOpponent(m.opponent2)),
      games: games.map(this.mapMatchGame),
      startDate: (games.length && games[0].scheduledDate) || new Date(),
    };
  };

  public mapBracket = async (
    b: TournamentBracketInfo,
  ): Promise<TournamentBracketInfoDto> => {
    return {
      stage: b.stage,
      round: b.round as RoundDto[],
      group: b.group,
      participant: await Promise.all(b.participant.map(this.mapParticipant)),
      match: await Promise.all(b.match.map(e => this.mapMatch(e))),
    };
  };

  private mapMatchGame = (mg: BracketMatchGameEntity): BracketMatchGameDto => {
    return {
      id: mg.id,
      bracket_match_id: mg.parent_id,
      externalMatchId: mg.externalMatchId,
      scheduledDate: mg.scheduledDate,
      teamOffset: mg.teamOffset,
      status: mg.status,
      number: mg.number,
      finished: mg.status >= Status.Completed,
      opponent1: mg.opponent1 && this.mapOpponentSmall(mg.opponent1),
      opponent2: mg.opponent2 && this.mapOpponentSmall(mg.opponent2),
    };
  };

  private mapOpponentSmall = (p: ParticipantResult): OpponentDto => ({
    id: Number(p.id),
    result: p.result,
    position: p.position,
    participant: {
      id: Number(p.id),
      tournament_id: 2,
    },
  });

  private mapParticipant = async (
    b: ParticipantEntity,
  ): Promise<BracketParticipantDto | undefined> => {
    if (b.id === undefined) return undefined;

    return {
      id: b.id,
      tournament_id: b.tournament_id,
      players: b.players.map(t => t.steamId),
      team:
        b.team &&
        (await this.teamMapper.mapTeam(
          await this.teamEntityRepository.findOne({
            where: { id: b.teamId },
            relations: ['members'],
          }),
        )),
    };
  };

  private mapOpponent = async (
    opp: ParticipantResult,
  ): Promise<ParticipantResultDto> => {
    const part: ParticipantEntity = await this.crud.select(
      'participant',
      opp.id,
    );
    return {
      ...opp,
      id: opp.id && Number(opp.id),
      score: opp.score,
      participant: await this.mapParticipant(part),
    };
  };
}
