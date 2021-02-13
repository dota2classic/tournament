import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TeamEntity } from '../../db/entity/team.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TeamMemberEntity } from '../../db/entity/team-member.entity';
import { TeamInvitationEntity } from '../../db/entity/team-invitation.entity';
import { TournamentEntity } from '../../db/entity/tournament.entity';
import { BracketParticipantEntity } from '../../db/entity/bracket-participant.entity';
import { BracketEntryType } from '../../gateway/shared-types/tournament';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamEntityRepository: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly teamMemberEntityRepository: Repository<TeamMemberEntity>,
    @InjectRepository(TeamInvitationEntity)
    private readonly teamInvitationEntityRepository: Repository<
      TeamInvitationEntity
    >,
    @InjectRepository(BracketParticipantEntity)
    private readonly bracketParticipantEntityRepository: Repository<
      BracketParticipantEntity
    >,
  ) {}

  public async createTeam(
    name: string,
    tag: string,
    imageUrl: string,
    created_by: string, // steam id
  ): Promise<TeamEntity> {
    const isTagTaken = await this.teamEntityRepository.findOne({
      tag,
    });
    if (isTagTaken) throw new ForbiddenException();


    const t = new TeamEntity();
    t.creator = created_by;
    t.name = name;
    t.tag = tag;
    t.imageUrl = imageUrl;

    await this.teamEntityRepository.save(t);

    await this.joinTeam(t.id, created_by);

    return this.fullTeam(t.id);
  }

  public async joinTeam(teamId: string, steam_id: string) {
    const t = await this.fullTeam(teamId);

    if (!t) return;

    // can't join if its 5 guys
    if (t.members.length >= 5) return;

    // can't join if it's locked
    if (t.locked) return;

    const existingMembership = await this.teamMemberEntityRepository.findOne({
      steam_id: steam_id,
    });

    if (existingMembership) {
      // if this dude is in team, we remove him
      await this.teamMemberEntityRepository.delete(existingMembership);
    }

    const membership = new TeamMemberEntity();
    membership.steam_id = steam_id;
    membership.teamId = teamId;

    await this.teamMemberEntityRepository.save(membership);
  }

  public async fullTeam(id: string) {
    return this.teamEntityRepository.findOne(
      {
        id,
        archived: false
      },
      { relations: ['members'] },
    );
  }

  public async findTeamOf(steamId: string) {
    return this.teamMemberEntityRepository
      .findOne(
        {
          steam_id: steamId,
        },
        {
          relations: ['team', 'team.members'],
        },
      )
      .then(t => t.team);
  }
  public async inviteToTeam(inviter: string, steam_id: string) {
    const team = await this.findTeamOf(inviter);

    if (!team) throw new NotFoundException();

    // we cant invite if 5 in team
    if (team.members.length >= 5) return;

    // only member can invite
    if (!team.members.find(t => t.steam_id === inviter)) return;

    const existingInvite = await this.teamInvitationEntityRepository.findOne({
      steam_id,
      teamId: team.id,
    });

    if (existingInvite) return;

    const inv = new TeamInvitationEntity();
    inv.teamId = team.id;
    inv.steam_id = steam_id;
    await this.teamInvitationEntityRepository.save(inv);
    return this.fullTeam(team.id);
  }

  public async submitInvitation(id: number, accept: boolean) {
    const inv = await this.teamInvitationEntityRepository.findOne(id);
    if (!inv) return;

    try {
      if (accept) await this.joinTeam(inv.teamId, inv.steam_id);
    } catch (e) {
    } finally {
      await this.teamInvitationEntityRepository.delete(inv);
    }
  }

  public async getTournaments(teamId: string): Promise<TournamentEntity[]> {
    const res = await this.bracketParticipantEntityRepository
      .createQueryBuilder('p')
      .leftJoinAndMapOne(
        'p.tournament',
        TournamentEntity,
        'tour',
        'p.tournament_id = tour.id',
      )
      .where('tour.entryType = :type', { type: BracketEntryType.TEAM })
      .andWhere('p.name = :teamId', { teamId })
      .getMany();

    return res.map(t => t.tournament);
  }

  public async leaveTeam(steamId: string) {
    const team = await this.findTeamOf(steamId);
    if (team && !team.locked) {
      if (team.creator === steamId) {
        // if creator leaves team, team is deleted
        const members = await this.teamMemberEntityRepository.find({
          teamId: team.id,
        });
        // delete all members
        await this.teamMemberEntityRepository.delete(members.map(t => t.id));
        team.archived = true;
        await this.teamEntityRepository.save(team);
        return;
      }
      const membership = await this.teamMemberEntityRepository.findOne({
        steam_id: steamId,
        teamId: team.id,
      });
      if (membership) {
        await this.teamMemberEntityRepository.delete(membership);
      }
    }
    return team;
  }

  public async kickFromTeam(requesterSteamId: string, kickedSteamId: string) {
    const team = await this.findTeamOf(requesterSteamId);

    // can't kick myself
    if (requesterSteamId === kickedSteamId) return;
    if (team && !team.locked && team.creator === requesterSteamId) {
      const membership = await this.teamMemberEntityRepository.findOne({
        steam_id: kickedSteamId,
        teamId: team.id,
      });
      if (membership) {
        await this.teamMemberEntityRepository.delete(membership);
      }
    }
    return team;
  }
}
