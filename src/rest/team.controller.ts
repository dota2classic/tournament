import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateTeamDto, CreateTeamInviteDto, SubmitInvitationDto, TeamDto } from './dto/team.dto';
import { TeamService } from './tournament/team.service';
import { TeamMapper } from './mapper/team.mapper';

@Controller('team')
@ApiTags('team')
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly teamMapper: TeamMapper,
  ) {}

  @Get(`/view/:id`)
  public async getTeam(@Param('id') id: string): Promise<TeamDto> {
    return this.teamService.fullTeam(id).then(this.teamMapper.mapTeam);
  }

  @Post(`/invite`)
  public async inviteToTeam(
    @Body() dto: CreateTeamInviteDto
  ): Promise<TeamDto> {
    await this.teamService.inviteToTeam(dto.teamId, dto.inviter, dto.invited);
    return this.getTeam(dto.teamId);
  }


  @Post(`/submit_invite/:id`)
  public async submitInvite(
    @Param('id') id: number,
    @Body() dto: SubmitInvitationDto
  ) {
    await this.teamService.submitInvitation(id, dto.accept)
  }

  @Post(`/create`)
  public async createTeam(@Body() dto: CreateTeamDto): Promise<TeamDto> {
    return this.teamService
      .createTeam(dto.name, dto.tag, dto.imageUrl, dto.creator)
      .then(this.teamMapper.mapTeam);
  }
}
