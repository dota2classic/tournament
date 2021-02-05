import { Injectable } from '@nestjs/common';
import { TeamEntity } from '../../db/entity/team.entity';
import { TeamDto } from '../dto/team.dto';

@Injectable()
export class TeamMapper {
  public mapTeam = (team: TeamEntity): TeamDto => ({
    name: team.name,
    tag: team.tag,
    imageUrl: team.imageUrl,
    creator: team.creator,
    members: team.members.map(t => ({
      steam_id: t.steam_id,
    })),
  });
}
