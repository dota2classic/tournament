import { CacheModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisController } from './redis.controller';
import { isDev, REDIS_PASSWORD, REDIS_URL } from './config/env';
import { devDbConfig, Entities, prodDbConfig } from './config/entities';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { BracketService } from './tournament/service/bracket.service';
import { BracketCrud } from './rest/tournament/bracket.crud';
import { TournamentController } from './rest/tournament.controller';
import { TournamentMapper } from './rest/mapper/tournament.mapper';
import { qCache, UserRepository } from './rest/caches/user.repository';
import { outerQuery } from './gateway/util/outerQuery';
import { GetUserInfoQuery } from './gateway/queries/GetUserInfo/get-user-info.query';
import { TeamController } from './rest/team.controller';
import { TeamService } from './tournament/service/team.service';
import { TeamMapper } from './rest/mapper/team.mapper';
import { ScheduleModule } from '@nestjs/schedule';
import { BracketMatchService } from './tournament/service/bracket-match.service';
import { AppService } from './app.service';
import { MatchStartedHandler } from './tournament/event/match-started.handler';
import { GameResultsHandler } from './tournament/event/game-results.handler';
import { UtilQuery } from './tournament/service/util-query';
import { BracketMapper } from './rest/mapper/bracket.mapper';
import { BracketUpdatedHandler } from './tournament/event/bracket-updated.handler';
import { MatchCancelledHandler } from './tournament/event/match-cancelled.handler';
import { MatchGameService } from './tournament/service/match-game.service';
import { BracketsManager } from 'brackets-manager';
import { BracketGameResultHandler } from './tournament/event/bracket-game-result/bracket-game-result.handler';
import { BracketGameTimerReadyHandler } from './tournament/event/bracket-game-timer-ready/bracket-game-timer-ready.handler';
import { GameScheduleService } from './tournament/service/game-schedule.service';

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
    AppService,
    TeamService,
    BracketMapper,
    TeamMapper,
    BracketService,
    UserRepository,
    TournamentMapper,
    BracketMatchService,
    BracketCrud,
    UtilQuery,
    GameScheduleService,
    MatchCancelledHandler,

    MatchGameService,
    BracketGameResultHandler,
    BracketGameTimerReadyHandler,

    {
      provide: BracketsManager,
      useFactory: (crud: BracketCrud) => {
        return new BracketsManager(crud);
      },
      inject: [BracketCrud],
    },

    MatchStartedHandler,
    GameResultsHandler,
    BracketUpdatedHandler,
    outerQuery(GetUserInfoQuery, 'QueryCore', qCache()),
  ],
})
export class AppModule {}
