import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BracketCrud } from './tournament/bracket.crud';
import { TournamentMapper } from './mapper/tournament.mapper';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateTournamentDto,
  FullTournamentDto,
  TournamentDto,
} from './dto/tournament.dto';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketService } from './tournament/bracket.service';
import { CompactTeamDto } from './dto/team.dto';
import { TeamMapper } from './mapper/team.mapper';

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
}
