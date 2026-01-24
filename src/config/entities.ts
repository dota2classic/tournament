import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';
import { TournamentRegistrationEntity } from '../db/entity/tournament-registration.entity';
import { TeamInvitationEntity } from 'db/entity/team-invitation.entity';
import { TeamMemberEntity } from 'db/entity/team-member.entity';
import { TeamEntity } from 'db/entity/team.entity';
import { BracketMatchEntity } from 'db/entity/bracket-match.entity';
import { RoundEntity } from 'db/entity/round.entity';
import { GroupEntity } from 'db/entity/group.entity';
import { StageEntity } from 'db/entity/stage.entity';
import { ParticipantEntity } from '../db/entity/participant.entity';
import { TournamentEntity } from 'db/entity/tournament.entity';
import { TournamentRegistrationPlayerEntity } from '../db/entity/tournament-registration-player.entity';
import { TournamentParticipantPlayerEntity } from '../db/entity/tournament-participant-player.entity';

export const Entities = [
  TournamentEntity,
  ParticipantEntity,
  TournamentParticipantPlayerEntity,
  StageEntity,
  GroupEntity,
  RoundEntity,
  BracketMatchEntity,
  TeamEntity,
  TeamMemberEntity,
  TeamInvitationEntity,
  TournamentRegistrationEntity,
  TournamentRegistrationPlayerEntity,
  BracketMatchGameEntity,
];
