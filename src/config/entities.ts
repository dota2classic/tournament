import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DB_HOST, DB_PASSWORD, DB_USERNAME } from './env';
import { BracketParticipantEntity } from '../db/entity/bracket-participant.entity';
import { StageEntity } from '../db/entity/stage.entity';
import { GroupEntity } from '../db/entity/group.entity';
import { RoundEntity } from '../db/entity/round.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { TeamEntity } from '../db/entity/team.entity';
import { TeamMemberEntity } from '../db/entity/team-member.entity';
import { TeamInvitationEntity } from '../db/entity/team-invitation.entity';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { MatchGameEntity } from '../db/entity/match-game.entity';

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
  MatchGameEntity
];

export const devDbConfig: any = {
  type: 'postgres',
  database: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'mypassword',
  entities: Entities,
  synchronize: true,
  dropSchema: true,
  keepConnectionAlive: true,
};

export const testDbConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: ':memory:',
  entities: Entities,
  synchronize: true,
  keepConnectionAlive: true,
  // dropSchema: true,
};

export const prodDbConfig: any = {
  type: 'postgres',
  database: 'postgres',
  host: DB_HOST(),
  port: 5432,
  username: DB_USERNAME(),
  password: DB_PASSWORD,
  entities: Entities,
  synchronize: true,

  ssl: false,
};
