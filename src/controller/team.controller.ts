import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateTeamDto,
  CreateTeamInviteDto,
  EditTeamDto,
  KickFromTeamDto,
  LeaveTeamDto,
  SubmitInvitationDto,
  TeamDto,
  TeamInvitationDto,
} from 'model/team.dto';
import { TeamService } from 'service/team.service';
import { TeamMapper } from 'mapper/team.mapper';
import { TeamEntity } from 'db/entity/team.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentDto } from 'model/tournament.dto';
import { BracketParticipantEntity } from 'db/entity/bracket-participant.entity';
import { TournamentMapper } from 'mapper/tournament.mapper';
import { TeamMemberEntity } from 'db/entity/team-member.entity';
import { TeamInvitationEntity } from 'db/entity/team-invitation.entity';

@Controller('team')
@ApiTags('team')
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly teamMapper: TeamMapper,
    private readonly tourMapper: TournamentMapper,
    @InjectRepository(TeamEntity)
    private readonly teamEntityRepository: Repository<TeamEntity>,
    @InjectRepository(BracketParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      BracketParticipantEntity
    >,
    @InjectRepository(TeamMemberEntity)
    private readonly teamMemberEntityRepository: Repository<TeamMemberEntity>,
    @InjectRepository(TeamInvitationEntity)
    private readonly teamInvitationEntityRepository: Repository<
      TeamInvitationEntity
    >,
  ) {}

  @Get(`/view/:id`)
  public async getTeam(@Param('id') id: string): Promise<TeamDto> {
    return this.teamService.fullTeam(id).then(this.teamMapper.mapTeam);
  }

  @Post(`/edit/:id`)
  public async editTeam(
    @Param('id') id: string,
    @Body() dto: EditTeamDto,
  ): Promise<TeamDto> {
    return this.teamService.editTeam(id, dto).then(this.teamMapper.mapTeam);
  }

  @Get('tournament_list/:id')
  public async getTournaments(
    @Param('id') id: string,
  ): Promise<TournamentDto[]> {
    return this.teamService
      .getTournaments(id)
      .then(t => t.map(this.tourMapper.mapTournament));
  }

  @Get(`/list`)
  public async listTeams(): Promise<TeamDto[]> {
    return this.teamEntityRepository
      .find({
        where: {
          archived: false,
        },
        relations: ['members'],
      })
      .then(t => t.map(this.teamMapper.mapTeam));
  }

  @Post(`/invite`)
  public async inviteToTeam(
    @Body() dto: CreateTeamInviteDto,
  ): Promise<TeamDto> {
    return this.teamService
      .inviteToTeam(dto.inviter, dto.invited)
      .then(this.teamMapper.mapTeam);
  }

  @Post(`/submit_invite/:id`)
  public async submitInvite(
    @Param('id') id: number,
    @Body() dto: SubmitInvitationDto,
  ) {
    await this.teamService.submitInvitation(id, dto.accept);
  }

  @Post(`/kick_from_team`)
  public async kickFromTeam(@Body() dto: KickFromTeamDto): Promise<TeamDto> {
    return this.teamService
      .kickFromTeam(dto.requesterSteamId, dto.kickedSteamId)
      .then(this.teamMapper.mapTeam);
  }

  @Post(`/leave_team`)
  public async leaveTeam(@Body() dto: LeaveTeamDto): Promise<TeamDto> {
    return this.teamService
      .leaveTeam(dto.steamId)
      .then(this.teamMapper.mapTeam);
  }

  @Post(`/create`)
  public async createTeam(@Body() dto: CreateTeamDto): Promise<TeamDto> {
    return this.teamService
      .createTeam(dto.name, dto.tag, dto.imageUrl, dto.creator)
      .then(this.teamMapper.mapTeam);
  }

  @Get('team_of/:id')
  public async getTeamOf(
    @Param('id') steamId: string,
  ): Promise<TeamDto | undefined> {
    const membership = await this.teamMemberEntityRepository.findOne({
      where: { steam_id: steamId },
      relations: ['team', 'team.members'],
    });
    if (membership) {
      return this.teamMapper.mapTeam(membership.team);
    }
  }

  @Get('team_invites/:steamId')
  public async getTeamInvites(
    @Param('steamId') steamId: string,
  ): Promise<TeamInvitationDto[]> {
    return this.teamInvitationEntityRepository
      .find({
        where: {
          steam_id: steamId,
        },
        relations: ['team', 'team.members'],
      })
      .then(t => Promise.all(t.map(this.teamMapper.mapTeamInvite)));
  }
}
