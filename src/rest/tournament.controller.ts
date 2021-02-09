import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BracketCrud } from './tournament/bracket.crud';
import { TournamentMapper } from './mapper/tournament.mapper';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateTournamentDto,
  ForfeitDto,
  FullTournamentDto,
  ScheduleTournamentMatchDto, SetMatchResultDto,
  TournamentDto,
  TournamentMatchDto,
} from './dto/tournament.dto';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketService } from './tournament/bracket.service';
import { CompactTeamDto } from './dto/team.dto';
import { TeamMapper } from './mapper/team.mapper';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { BracketMatchService } from './tournament/bracket-match.service';
import { UtilQuery } from '../tournament/service/util-query';

@Controller('tournament')
@ApiTags('tournament')
export class TournamentController {
  constructor(
    private readonly crud: BracketCrud,
    private readonly mapper: TournamentMapper,
    private readonly teamMapper: TeamMapper,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    private readonly bracketService: BracketService,
    private readonly bmService: BracketMatchService,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    private readonly utilQuery: UtilQuery,
  ) {}

  @Get('/bracket/:id')
  async getBracket(@Param('id') id: number) {
    const tournament = await this.tournamentEntityRepository.findOne(id);
    return this.crud
      .getBracket(id)
      .then(t => this.mapper.mapBracket(t, tournament));
  }

  @Get('/bracket2/:id')
  async getBracket2(@Param('id') id: number) {
    // const tournament = await this.tournamentEntityRepository.findOne(id)
    return this.crud.getBracket(id);
  }

  @Post(`/create/:id`)
  public async startTournament(
    @Param('id')
    id: number,
  ): Promise<FullTournamentDto> {
    return await this.bracketService
      .generateTournament(Number(id))
      .then(it => this.bracketService.fullTournament(id));
  }

  @Post(`/cancel/:id`)
  public async cancelTournament(
    @Param('id')
    id: number,
  ): Promise<FullTournamentDto> {
    return await this.bracketService
      .cancelTournament(Number(id))
      .then(it => this.bracketService.fullTournament(id));
  }

  @Post(`/create`)
  public async createTournament(
    @Body() dto: CreateTournamentDto,
  ): Promise<FullTournamentDto> {
    return await this.bracketService
      .createTournament(
        dto.name,
        dto.entryType,
        dto.startDate,
        dto.imageUrl,
        dto.strategy,
      )
      .then(it => this.bracketService.fullTournament(it.id));
  }

  // todo pagination
  @Get(`/list`)
  public async listTournaments(): Promise<TournamentDto[]> {
    return this.tournamentEntityRepository
      .find()
      .then(t => t.map(this.mapper.mapTournament));
  }

  @Get(`/teams/:id`)
  public async tournamentTeams(
    @Param('id') id: number,
  ): Promise<CompactTeamDto[]> {
    return this.bracketService
      .registeredTeams(id)
      .then(t => t.map(this.teamMapper.mapTeamCompact));
  }

  @Get(`/:id`)
  public async getTournament(
    @Param('id') id: number,
  ): Promise<FullTournamentDto> {
    return this.bracketService.fullTournament(id);
  }

  @Post(`/:id/join_tournament_team/:team_id`)
  public async registerTeam(
    @Param('id') tId: number,
    @Param('team_id') teamId: string,
  ) {
    return this.bracketService.registerTeam(tId, teamId);
  }

  @Post(`/:id/join_tournament_solo/:steam_id`)
  public async registerPlayer(
    @Param('id') tId: number,
    @Param('steam_id') steam_id: string,
  ) {
    return this.bracketService.registerSoloPlayer(tId, steam_id);
  }

  @Post(`/:id/leave_tournament_solo/:steam_id`)
  public async leaveTournamentPlayer(
    @Param('id') tId: number,
    @Param('steam_id') steam_id: string,
  ) {
    return this.bracketService.leaveSoloPlayer(tId, steam_id);
  }

  @Get('/tournament_match/:id')
  public async getTournamentMatch(
    @Param('id') id: number,
  ): Promise<TournamentMatchDto> {
    const m = await this.bracketMatchEntityRepository.findOne(id);
    const tour = await this.bracketService.findTournamentByMatchId(id);
    return this.mapper.mapTournamentMatch(tour.entryType, m);
  }

  @Post(`/tournament_match/:id/forfeit`)
  public async forfeit(
    @Param('id') id: number,
    @Body() fDto: ForfeitDto,
  ): Promise<TournamentMatchDto> {
    const m = await this.bracketService.forfeit(id, fDto.forfeitId);
    const t = await this.bracketService.findTournamentByMatchId(id);
    return this.bracketMatchEntityRepository
      .findOne(id)
      .then(() => this.mapper.mapTournamentMatch(t.entryType, m));
  }

  @Post(`/tournament_match/:id/winner`)
  public async setMatchWinner(
    @Param('id') id: number,
    @Body() fDto: SetMatchResultDto,
  ): Promise<TournamentMatchDto> {
    const m = await this.bracketService.setWinner(id, fDto.winnerId);
    const t = await this.bracketService.findTournamentByMatchId(id);
    return this.bracketMatchEntityRepository
      .findOne(id)
      .then(() => this.mapper.mapTournamentMatch(t.entryType, m));
  }

  @Post(`/tournament_match/:id/schedule`)
  public async scheduleTournamentMatch(
    @Param('id') id: number,
    @Body() scheduleDto: ScheduleTournamentMatchDto,
  ): Promise<TournamentMatchDto> {
    const m = await this.bracketMatchEntityRepository.findOne(id);
    if (m) {
      m.scheduledDate = new Date(scheduleDto.scheduledDate);
      await this.bracketMatchEntityRepository.save(m);

      const tourId = await this.utilQuery.matchTournamentId(m.id);
      await this.bmService.scheduleBracketMatch(tourId, m.id);
      return this.getTournamentMatch(m.id);
    }
  }
}
