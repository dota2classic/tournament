import { MatchGameEntity } from '../db/entity/match-game.entity';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { TeamInvitationEntity } from '../db/entity/team-invitation.entity';
import { TeamMemberEntity } from '../db/entity/team-member.entity';
import { TeamEntity } from '../db/entity/team.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { RoundEntity } from '../db/entity/round.entity';
import { GroupEntity } from '../db/entity/group.entity';
import { StageEntity } from '../db/entity/stage.entity';
import { BracketParticipantEntity } from '../db/entity/bracket-participant.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';

export const Entities = [
  TournamentEntity,
  BracketParticipantEntity,
  StageEntity,
  GroupEntity,
  RoundEntity,
  BracketMatchEntity,
  TeamEntity,
  TeamMemberEntity,
  TeamInvitationEntity,
  TournamentParticipantEntity,
  MatchGameEntity,
];
