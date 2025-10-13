import { Module } from '@nestjs/common';
import { RedisController } from './redis.controller';
import { ClientsModule, RedisOptions, Transport } from '@nestjs/microservices';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Bracket2Service } from './service/bracket2.service';
import { BracketCrud } from 'service/bracket.crud';
import { TournamentController } from 'controller/tournament.controller';
import { TournamentMapper } from 'mapper/tournament.mapper';
import { TeamController } from 'controller/team.controller';
import { TeamService } from 'service/team.service';
import { TeamMapper } from 'mapper/team.mapper';
import { ScheduleModule } from '@nestjs/schedule';
import { BracketMatchService } from 'service/bracket-match.service';
import { AppService } from './app.service';
import { MatchStartedHandler } from 'event/match-started.handler';
import { GameResultsHandler } from 'event/game-results.handler';
import { BracketMapper } from 'mapper/bracket.mapper';
import { BracketUpdatedHandler } from 'event/bracket-updated.handler';
import { MatchCancelledHandler } from 'event/match-cancelled.handler';
import { MatchGameService } from 'service/match-game.service';
import { BracketsManager } from 'brackets-manager';
import { BracketGameResultHandler } from 'event/bracket-game-result/bracket-game-result.handler';
import { BracketGameTimerReadyHandler } from 'event/bracket-game-timer-ready/bracket-game-timer-ready.handler';
import { GameScheduleService } from 'service/game-schedule.service';
import configuration from './config/configuration';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Entities } from './config/entities';
import { getTypeormConfig } from './config/typeorm.config';
import { BracketService } from './service/bracket.service';
import { TournamentRepository } from './repository/tournament.repository';

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
    Bracket2Service,
    TournamentMapper,
    BracketMatchService,
    BracketCrud,
    TournamentRepository,
    GameScheduleService,
    MatchCancelledHandler,
    BracketService,

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
