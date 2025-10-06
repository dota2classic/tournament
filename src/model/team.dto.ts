import { FullTournamentDto } from './tournament.dto';

export class CreateTeamDto {
  public readonly name: string;
  public readonly tag: string;
  public readonly imageUrl: string;
  public readonly creator: string;
}

export class TeamMemberDto {
  public readonly steam_id: string;
}
export class LeaveTeamDto {
  steamId: string;
}

export class KickFromTeamDto {
  requesterSteamId: string;
  kickedSteamId: string;
}
export class EditTeamDto {
  name?: string;
  tag?: string;
  imageUrl?: string;
}

export class TeamDto {

  public readonly id: string;
  public readonly name: string;
  public readonly tag: string;
  public readonly imageUrl: string;
  public readonly creator: string;
  public readonly locked: boolean
  public readonly members: TeamMemberDto[];
}


export class CompactTeamDto {

  public readonly id: string;
  public readonly name: string;
  public readonly tag: string;
  public readonly imageUrl: string;
  public readonly creator: string;
  public readonly locked: boolean
}


export class SubmitInvitationDto {
  accept: boolean;
}


export class CreateTeamInviteDto {
  public readonly inviter: string;
  public readonly invited: string;
}


export class TeamInvitationDto {
  team: CompactTeamDto;
  inviteId: number;
}
