import { Module } from '@nestjs/common';
import { RedisController } from './redis.controller';
import { ClientsModule, RedisOptions, Transport } from '@nestjs/microservices';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { BracketService } from './service/bracket.service';
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
import { BracketsManager } from 'brackets-manager';
import { BracketGameResultHandler } from 'event/bracket-game-result/bracket-game-result.handler';
import configuration from './config/configuration';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Entities } from './config/entities';
import { getTypeormConfig } from './config/typeorm.config';
import { TournamentRepository } from './repository/tournament.repository';
import { TournamentService } from './service/tournament.service';
import { ParticipationService } from './service/participation.service';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { RmqController } from './rmq.controller';
import { MatchScheduleService } from './service/match-schedule.service';
import { RedlockModule } from '@dota2classic/redlock';
import { RedlockModuleOptions } from '@dota2classic/redlock/dist/redlock.module-definition';
import { MatchFailedHandler } from './event/match-failed.handler';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CqrsModule,
    RedlockModule.registerAsync({
      imports: [],
      inject: [ConfigService],
      useFactory(config: ConfigService): RedlockModuleOptions {
        return {
          host: config.get('redis.host'),
          password: config.get('redis.password'),
          port: parseInt(config.get('redis.port')) || 6379,
          options: {
            driftFactor: 0.01,
            retryCount: 0,
            automaticExtensionThreshold: 500,
          },
        };
      },
    }),
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
    RabbitMQModule.forRootAsync({
      useFactory(config: ConfigService): RabbitMQConfig {
        return {
          exchanges: [
            {
              name: 'app.events',
              type: 'topic',
            },
          ],
          enableControllerDiscovery: true,
          uri: `amqp://${config.get('rabbitmq.user')}:${config.get(
            'rabbitmq.password',
          )}@${config.get('rabbitmq.host')}:${config.get('rabbitmq.port')}`,
        };
      },
      imports: [],
      inject: [ConfigService],
    }),
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
  controllers: [
    RedisController,
    TeamController,
    TournamentController,
    RmqController,
  ],
  providers: [
    AppService,
    TeamService,
    BracketMapper,
    TeamMapper,
    BracketService,
    TournamentMapper,
    BracketMatchService,
    BracketCrud,
    TournamentRepository,
    MatchCancelledHandler,
    TournamentService,
    ParticipationService,
    MatchScheduleService,

    BracketGameResultHandler,
    MatchFailedHandler,

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
