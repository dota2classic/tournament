import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BracketCrud } from './tournament/bracket.crud';
import { TournamentMapper } from './mapper/tournament.mapper';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateTournamentDto,
  ForfeitDto,
  FullTournamentDto,
  ScheduleTournamentMatchDto,
  SetMatchResultDto,
  TournamentDto,
} from './dto/tournament.dto';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketService } from '../tournament/service/bracket.service';
import { CompactTeamDto } from './dto/team.dto';
import { TeamMapper } from './mapper/team.mapper';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { BracketMatchService } from '../tournament/service/bracket-match.service';
import { UtilQuery } from '../tournament/service/util-query';
import { BracketMatchDto, TournamentBracketInfoDto } from './dto/bracket.dto';
import { BracketMapper } from './mapper/bracket.mapper';
import { MatchGameEntity } from '../db/entity/match-game.entity';
import { EventBus } from '@nestjs/cqrs';
import { GameScheduleService } from '../tournament/service/game-schedule.service';
import { MatchGameService } from '../tournament/service/match-game.service';

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
    @InjectRepository(MatchGameEntity)
    private readonly matchGameEntityRepository: Repository<MatchGameEntity>,
    private readonly utilQuery: UtilQuery,
    private readonly bracketMapper: BracketMapper,
    private readonly ebus: EventBus,
    private readonly scheduler: GameScheduleService,
    private readonly matchGameService: MatchGameService,
  ) {}

  @Get('/bracket/:id')
  async getBracket(@Param('id') id: number) {
    const tournament = await this.tournamentEntityRepository.findOneById(id);
    return this.crud
      .getBracket(id)
      .then(t => this.mapper.mapBracket(t, tournament));
  }

  @Get('/bracket2/:id')
  async getBracket2(
    @Param('id') id: number,
  ): Promise<TournamentBracketInfoDto> {
    // const tournament = await this.tournamentEntityRepository.findOne(id)
    return this.crud.getBracket(id).then(this.bracketMapper.mapBracket);
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
        dto.version,
        dto.strategy,
        {
          round: dto.roundBestOf || 1,
          final: dto.finalBestOf || 1,
          grandFinal: dto.grandFinalBestOf || 1,
        },
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

  @Post(`/:id/join_tournament_team/:steam_id`)
  public async registerTeam(
    @Param('id') tId: number,
    @Param('steam_id') steamId: string,
  ) {
    return this.bracketService.registerTeamByPlayer(tId, steamId);
  }

  @Post(`/:id/join_tournament_solo/:steam_id`)
  public async registerPlayer(
    @Param('id') tId: number,
    @Param('steam_id') steam_id: string,
  ) {
    return this.bracketService.registerSoloPlayer(tId, steam_id);
  }

  @Post(`/:id/leave_tournament_team/:steam_id`)
  public async leaveTournamentTeam(
    @Param('id') tId: number,
    @Param('steam_id') steamId: string,
  ) {
    return this.bracketService.leaveTournamentAsTeam(tId, steamId);
  }

  @Post(`/:id/leave_tournament_solo/:steam_id`)
  public async leaveTournamentPlayer(
    @Param('id') tId: number,
    @Param('steam_id') steam_id: string,
  ) {
    return this.bracketService.leaveTournamentAsPlayer(tId, steam_id);
  }

  @Get('/tournament_match/:id')
  public async getTournamentMatch(
    @Param('id') id: number,
  ): Promise<BracketMatchDto> {
    const m = await this.bracketMatchEntityRepository.findOneById(id);
    const t = await this.bracketService.findTournamentByMatchId(id);
    return this.bracketMapper.mapMatch(t.entryType, m);
  }


  @Post(`/tournament_match/:id/winner`)
  public async setMatchWinner(
    @Param('id') id: number,
    @Body() dto: SetMatchResultDto,
  ): Promise<BracketMatchDto> {
    await this.matchGameService.setWinner(dto.gameId, dto.winnerId);
    return this.getTournamentMatch(id);
  }

  @Post(`/tournament_match/:id/schedule`)
  public async scheduleTournamentMatch(
    @Param('id') id: number,
    @Body() scheduleDto: ScheduleTournamentMatchDto,
  ): Promise<BracketMatchDto> {
    const m = await this.bracketMatchEntityRepository.findOneById(id);
    if (!m) return;

    const tourId = await this.utilQuery.matchTournamentId(m.id);
    await this.scheduler.scheduleGame(
      tourId,
      m.id,
      scheduleDto.gameId,
      scheduleDto.scheduledDate,
    );

    return this.getTournamentMatch(m.id);
  }
}
