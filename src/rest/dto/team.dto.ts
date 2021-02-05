export class CreateTeamDto {
  public readonly name: string;
  public readonly tag: string;
  public readonly imageUrl: string;
  public readonly creator: string;
}

export class TeamMemberDto {
  public readonly steam_id: string;
}
export class TeamDto {
  public readonly name: string;
  public readonly tag: string;
  public readonly imageUrl: string;
  public readonly creator: string;
  public readonly members: TeamMemberDto[]
}


export class SubmitInvitationDto {
  accept: boolean;
}


export class CreateTeamInviteDto {
  public readonly inviter: string;
  public readonly invited: string;
  public readonly teamId: string;
}