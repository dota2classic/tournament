import { Injectable } from '@nestjs/common';
import { TeamEntity } from '../../db/entity/team.entity';
import { CompactTeamDto, TeamDto, TeamInvitationDto } from '../dto/team.dto';
import { TeamInvitationEntity } from '../../db/entity/team-invitation.entity';

@Injectable()
export class TeamMapper {
  public mapTeam = (team: TeamEntity): TeamDto => ({
    name: team.name,
    tag: team.tag,
    id: team.id,
    imageUrl: team.imageUrl,
    creator: team.creator,
    members: team.members.map(t => ({
      steam_id: t.steam_id,
    })),
  });


  public mapTeamCompact = (team: TeamEntity): CompactTeamDto => ({
    name: team.name,
    tag: team.tag,
    id: team.id,
    imageUrl: team.imageUrl,
    creator: team.creator,
  });



  public mapTeamInvite = (invite: TeamInvitationEntity): TeamInvitationDto => ({
    team: this.mapTeamCompact(invite.team),
    inviteId: invite.id
  })
}
