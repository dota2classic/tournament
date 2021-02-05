import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BracketCrud } from './tournament/bracket.crud';
import { TournamentMapper } from './mapper/tournament.mapper';
import { ApiTags } from '@nestjs/swagger';
import { CreateTournamentDto, TournamentDto } from './dto/tournament.dto';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketService } from './tournament/bracket.service';

@Controller('tournament')
@ApiTags('tournament')
export class TournamentController {
  constructor(
    private readonly crud: BracketCrud,
    private readonly mapper: TournamentMapper,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    private readonly bracketService: BracketService,
  ) {}

  @Get('/bracket/:id')
  async getBracket(@Param('id') id: number) {
    return this.crud.getBracket(id).then(t => this.mapper.mapBracket(t));
  }

  @Post(`/create`)
  public async createTournament(
    @Body() dto: CreateTournamentDto,
  ): Promise<TournamentDto> {
    return await this.bracketService.createTournament(dto.name, dto.entryType);
  }

  @Get(`/:id`)
  public async getTournament(@Param('id') id: number): Promise<TournamentDto> {
    return this.tournamentEntityRepository.findOne(id);
  }

  @Post(`/:id/join_tournament_team/:team_id`)
  public async registerTeam(
    @Param('id') tId: number,
    @Param('team_id') teamId: number,
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


}
