import { Injectable } from '@nestjs/common';
import { BracketCrud, TournamentBracketInfo } from '../service/bracket.crud';
import {
  BracketMatchDto,
  BracketMatchGameDto,
  BracketParticipantDto,
  ParticipantResultDto,
  TournamentBracketInfoDto,
} from '../model/bracket.dto';
import { BracketParticipantEntity } from '../db/entity/bracket-participant.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketEntryType } from '../gateway/shared-types/tournament';
import { TeamMapper } from './team.mapper';
import { TeamEntity } from '../db/entity/team.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { MatchGameEntity } from '../db/entity/match-game.entity';
import { ParticipantResult, Status } from 'brackets-model';

@Injectable()
export class BracketMapper {
  constructor(
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamEntityRepository: Repository<TeamEntity>,
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
    private readonly teamMapper: TeamMapper,
    private readonly crud: BracketCrud,
  ) {}

  private mapParticipant = async (
    entryType: BracketEntryType,
    b: BracketParticipantEntity,
  ): Promise<BracketParticipantDto | undefined> => {
    if (b.name === undefined) return undefined;
    switch (entryType) {
      case BracketEntryType.PLAYER:
        return {
          steam_id: b.name,
          tournament_id: b.tournament_id,
          id: b.id,
        };
      case BracketEntryType.TEAM:
        return {
          tournament_id: b.tournament_id,
          team: this.teamMapper.mapTeam(
            await this.teamEntityRepository.findOne({
              where: { id: b.name },
              relations: ['members'],
            }),
          ),
          id: b.id,
        };
    }
  };

  public mapBracket = async (
    b: TournamentBracketInfo,
  ): Promise<TournamentBracketInfoDto> => {
    return {
      ...b,
      participant: await Promise.all(
        b.participant.map(p => this.mapParticipant(b.tournament.entryType, p)),
      ),
      match: await Promise.all(
        b.match.map(e => this.mapMatch(b.tournament.entryType, e)),
      ),
    };
  };

  private mapOpponent = async (
    entryType: BracketEntryType,
    opp: ParticipantResult,
  ): Promise<ParticipantResultDto> => {
    const part: BracketParticipantEntity = await this.crud.select(
      'participant',
      opp.id,
    );
    return {
      ...opp,
      participant: await this.mapParticipant(entryType, part),
    };
  };

  public mapMatch = async (
    entryType: BracketEntryType,
    m: BracketMatchEntity,
  ): Promise<BracketMatchDto> => {
    const games = await this.matchGameEntityRepository.find({
      where: {
        bm_id: m.id,
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
      status: Status[m.status] as any,
      opponent1:
        m.opponent1 && (await this.mapOpponent(entryType, m.opponent1)),
      opponent2:
        m.opponent2 && (await this.mapOpponent(entryType, m.opponent2)),
      games: games.map(this.mapMatchGame),
      startDate:
        (games.length && games[0].scheduledDate.getTime()) ||
        new Date().getTime(),
    };
  };

  private mapMatchGame = (mg: MatchGameEntity): BracketMatchGameDto => {
    return {
      id: mg.id,
      bm_id: mg.bm_id,
      externalMatchId: mg.externalMatchId,
      scheduledDate: mg.scheduledDate.getTime(),
      teamOffset: mg.teamOffset,
      number: mg.number,
      finished: mg.finished,
    };
  };
}
