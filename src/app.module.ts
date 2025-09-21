import { Module } from '@nestjs/common';
import { RedisController } from './redis.controller';
import { ClientsModule, RedisOptions, Transport } from '@nestjs/microservices';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { BracketService } from './tournament/service/bracket.service';
import { BracketCrud } from './rest/tournament/bracket.crud';
import { TournamentController } from './rest/tournament.controller';
import { TournamentMapper } from './rest/mapper/tournament.mapper';
import { UserRepository } from './rest/caches/user.repository';
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
import configuration from './config/configuration';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Entities } from './config/entities';
import { getTypeormConfig } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CqrsModule,
    TypeOrmModule.forRootAsync({
      useFactory(config: ConfigService): TypeOrmModuleOptions {
        return {
          ...getTypeormConfig(config),
          type: 'postgres',
          migrations: ['dist/db/migrations/*.*'],
          migrationsRun: true,
          logging: ['error'],
        };
      },
      imports: [],
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature(Entities),
    ClientsModule.registerAsync([
      {
        name: 'QueryCore',
        useFactory(config: ConfigService): RedisOptions {
          return {
            transport: Transport.REDIS,
            options: {
              host: config.get('redis.host'),
              password: config.get('redis.password'),
              reconnectOnError: () => true,
              connectTimeout: 3000,
              retryAttempts: 100000,
              maxRetriesPerRequest: 10,
              keepAlive: 1,
            },
          };
        },
        inject: [ConfigService],
        imports: [],
      },
    ]),
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
  ],
})
export class AppModule {}
