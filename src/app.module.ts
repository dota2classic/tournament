import { CacheModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisController } from './redis.controller';
import { isDev, REDIS_PASSWORD, REDIS_URL } from './config/env';
import { devDbConfig, Entities, prodDbConfig } from './config/entities';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { BracketService } from './rest/tournament/bracket.service';
import { BracketCrud } from './rest/tournament/bracket.crud';
import { TournamentController } from './rest/tournament.controller';
import { TournamentMapper } from './rest/mapper/tournament.mapper';
import { qCache, UserRepository } from './rest/caches/user.repository';
import { outerQuery } from './gateway/util/outerQuery';
import { GetUserInfoQuery } from './gateway/queries/GetUserInfo/get-user-info.query';
import { TeamController } from './rest/team.controller';
import { TeamService } from './rest/tournament/team.service';
import { TeamMapper } from './rest/mapper/team.mapper';
import { ScheduleModule } from '@nestjs/schedule';
import { BracketMatchService } from './rest/tournament/bracket-match.service';

@Module({
  imports: [
    CacheModule.register(),
    ScheduleModule.forRoot(),
    CqrsModule,
    TypeOrmModule.forRoot(
      (isDev ? devDbConfig : prodDbConfig) as TypeOrmModuleOptions,
    ),
    TypeOrmModule.forFeature(Entities),
    ClientsModule.register([
      {
        name: 'QueryCore',
        transport: Transport.REDIS,
        options: {
          url: REDIS_URL(),
          password: REDIS_PASSWORD(),
          retryAttempts: Infinity,
          retryDelay: 5000,
        },
      },
    ] as any),
  ],
  controllers: [RedisController, TeamController, TournamentController],
  providers: [
    TeamService,
    TeamMapper,
    BracketService,
    UserRepository,
    TournamentMapper,
    BracketMatchService,
    BracketCrud,
    outerQuery(GetUserInfoQuery, 'QueryCore', qCache()),
  ],
})
export class AppModule {}
