import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BracketCrud } from '../service/bracket.crud';
import { TournamentMapper } from '../mapper/tournament.mapper';
import { ApiTags } from '@nestjs/swagger';
import {
  BracketDto,
  ConfirmRegistrationDto,
  CreateTournamentDto,
  RegisterAsPartyDto,
  ScheduleTournamentGameDto,
  SetGameWinnerDto,
  StartGameDto,
  TournamentDto,
  TournamentRegistrationState,
  UnregisterPlayerDto,
  UpdateTournamentDto,
} from '../model/tournament.dto';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketService } from '../service/bracket.service';
import { TeamMapper } from '../mapper/team.mapper';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { BracketMatchService } from '../service/bracket-match.service';
import { BracketMapper } from '../mapper/bracket.mapper';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { TournamentRepository } from '../repository/tournament.repository';
import { TournamentService } from '../service/tournament.service';
import { ParticipationService } from '../service/participation.service';
import { MatchScheduleService } from '../service/match-schedule.service';
import { TournamentBracketInfoDto } from '../model/bracket.dto';

@Controller('tournament')
@ApiTags('tournament')
export class TournamentController {
  constructor(
    private readonly crud: BracketCrud,
    private readonly mapper: TournamentMapper,
    private readonly teamMapper: TeamMapper,
    private readonly bracketMapper: BracketMapper,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    private readonly bracketService: BracketService,
    private readonly bmService: BracketMatchService,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<BracketMatchEntity>,
    @InjectRepository(BracketMatchGameEntity)
    private readonly matchGameEntityRepository: Repository<BracketMatchGameEntity>,
    private readonly matchService: BracketMatchService,
    private readonly utilQuery: TournamentRepository,
    private readonly tournamentService: TournamentService,
    private readonly participationService: ParticipationService,
    private readonly matchScheduleService: MatchScheduleService,
  ) {}

  // todo pagination
  @Get(`/list`)
  public async listTournaments(): Promise<TournamentDto[]> {
    return this.tournamentEntityRepository
      .find({
        relations: ['registrations', 'registrations.players'],
      })
      .then((t) => t.map(this.mapper.mapTournament));
  }

  // Tournament statuses
  @Post()
  async createTournament(@Body() dto: CreateTournamentDto) {
    const tournament = await this.tournamentService.createTournament(
      dto.teamSize,
      dto.name,
      dto.strategy,
      dto.description,
      dto.imageUrl,
      dto.prize,
      new Date(dto.startDate),
      {
        round: dto.roundBestOf,
        final: dto.finalBestOf,
        grandFinal: dto.grandFinalBestOf,
      },
      dto.gameMode,
      {
        gameBreakDurationSeconds: dto.gameBreakDurationSeconds,
        gameDurationSeconds: dto.gameDurationSeconds,
      },
    );
    return this.mapper.mapTournament(tournament);
  }

  @Patch(':id')
  async updateTournament(
    @Param('id') id: number,
    @Body() dto: UpdateTournamentDto,
  ) {
    const tournament = await this.tournamentService.updateTournament(id, dto);
    return this.mapper.mapTournament(tournament);
  }

  @Post(':id/publish_tournament')
  async publishTournament(@Param('id') id: number) {
    return this.tournamentService.publish(id).then(this.mapper.mapTournament);
  }

  @Post(':id/end_registration')
  async endRegistration(@Param('id') id: number) {
    return this.tournamentService
      .startReadyCheck(id)
      .then(this.mapper.mapTournament);
  }

  @Post(':id/end_ready_check')
  async endReadyCheck(@Param('id') id: number) {
    return this.tournamentService
      .finishReadyCheck(id)
      .then(this.mapper.mapTournament);
  }

  @Post(':id/finish_tournament')
  async finishTournament(@Param('id') id: number) {
    return this.tournamentService
      .finishTournament(id)
      .then(this.mapper.mapTournament);
  }

  @Get(':id')
  async getTournament(@Param('id') id: number) {
    return this.tournamentService
      .getFullTournament(id)
      .then(this.mapper.mapTournament);
  }

  @Get(':id/matches')
  async getTournamentMatches(@Param('id') id: number) {
    return this.matchService
      .getMatches(id)
      .then((matches) => Promise.all(matches.map(this.bracketMapper.mapMatch)));
  }

  @Post(':id/confirm_registration')
  async confirmRegistration(
    @Param('id') id: number,
    @Body() confirmRegistrationDto: ConfirmRegistrationDto,
  ) {
    await this.participationService.setRegistrationConfirmed(
      id,
      confirmRegistrationDto.steamId,
      confirmRegistrationDto.confirm
        ? TournamentRegistrationState.CONFIRMED
        : TournamentRegistrationState.DECLINED,
    );
  }

  // Registration
  @Post(':id/register')
  public async register(
    @Param('id') id: number,
    @Body() dto: RegisterAsPartyDto,
  ) {
    return this.participationService
      .registerAsParty(id, dto.steamIds)
      .then((t) => t.id);
  }

  @Post(':id/unregister')
  public async unregister(
    @Param('id') id: number,
    @Body() dto: UnregisterPlayerDto,
  ) {
    await this.participationService.unregisterPlayer(id, dto.steamId);
  }

  // Bracket
  @Get('/:id/bracket')
  async getBracket(@Param('id') id: number) {
    const tournament = await this.tournamentEntityRepository.findOneBy({ id });
    return this.crud
      .getBracket(id)
      .then((t) => this.mapper.mapBracket(t, tournament));
  }

  @Get('/:id/bracket_render')
  async getBracketRender(
    @Param('id') id: number,
  ): Promise<TournamentBracketInfoDto> {
    return await this.crud.getBracket(id).then(this.bracketMapper.mapBracket);
  }

  @Post('/:id/auto_schedule_bracket')
  async autoScheduleBracket(@Param('id') id: number) {
    await this.matchScheduleService.autoScheduleMatches(id);
    return this.getBracket(id);
  }

  @Post(`/:id/generate_bracket`)
  public async startTournament(@Param('id') id: number): Promise<BracketDto> {
    await this.bracketService.generateBracket(id);
    await this.matchScheduleService.autoScheduleMatches(id);
    return this.getBracket(id);
  }

  @Post(':id/set_game_winner')
  public async setGameWinner(
    @Param('id') id: number,
    @Body() dto: SetGameWinnerDto,
  ) {
    await this.matchService.setGameWinner(
      dto.gameId,
      dto.winnerId,
      dto.d2cMatchId,
    );
  }

  @Get(':id/match_info/:match_id')
  public async getMatch(
    @Param('id') id: number,
    @Param('match_id') matchId: number,
  ) {
    return this.matchService
      .getMatch(matchId)
      .then(this.bracketMapper.mapMatch);
  }

  @Post(':id/start_game')
  public async startGame(@Param('id') id: number, @Body() dto: StartGameDto) {
    await this.matchScheduleService.submitGameToLaunch(dto.gameId);
  }

  @Post(':id/schedule_game')
  public async scheduleMatch(
    @Param('id') id: number,
    @Body() dto: ScheduleTournamentGameDto,
  ) {
    await this.matchScheduleService.scheduleMatchGame(
      dto.gameId,
      new Date(dto.scheduledDate),
    );
  }

  // @Post(`/tournament_match/:id/schedule`)
  // public async scheduleTournamentMatch(
  //   @Param('id') id: number,
  //   @Body() scheduleDto: ScheduleTournamentMatchDto,
  // ): Promise<BracketMatchDto> {
  //   const m = await this.bracketMatchEntityRepository.findOneById(id);
  //   if (!m) return;
  //
  //   const tourId = await this.utilQuery.matchTournamentId(m.id);
  //   await this.scheduler.scheduleGame(
  //     tourId,
  //     m.id,
  //     scheduleDto.gameId,
  //     scheduleDto.scheduledDate,
  //   );
  //
  //   return this.getTournamentMatch(m.id);
  // }
}
