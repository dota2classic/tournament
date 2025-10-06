import { Test, TestingModule } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import { Constructor, CqrsModule, EventBus } from '@nestjs/cqrs';
import { ObjectLiteral, Repository } from 'typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import {
  ClientsModule,
  RedisOptions,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { ConfigModule } from '@nestjs/config';
import {
  RabbitMQContainer,
  StartedRabbitMQContainer,
} from '@testcontainers/rabbitmq';
import { WinstonWrapper } from '@dota2classic/nest_logger';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { TeamController } from 'controller/team.controller';
import { TournamentController } from 'controller/tournament.controller';
import { BracketService } from 'service/bracket.service';
import { BracketMatchService } from 'service/bracket-match.service';
import { GameScheduleService } from 'service/game-schedule.service';
import { MatchGameService } from 'service/match-game.service';
import { TeamService } from 'service/team.service';
import { UtilQuery } from 'service/util-query';
import { Entities } from 'config/entities';
import { TeamMapper } from 'mapper/team.mapper';
import { BracketMapper } from 'mapper/bracket.mapper';
import { TournamentMapper } from 'mapper/tournament.mapper';
import { BracketCrud } from 'service/bracket.crud';
import { BracketsManager } from 'brackets-manager';
import { ScheduleModule } from '@nestjs/schedule';
import SpyInstance = jest.SpyInstance;

export interface TestEnvironment {
  module: TestingModule;
  app: INestApplication;
  containers: {
    pg: StartedPostgreSqlContainer;
    redis: StartedRedisContainer;
    rabbit: StartedRabbitMQContainer;
  };
  ebus: EventBus;
  ebusSpy: SpyInstance;
  queryMocks: Record<string, jest.Mock>;

  service<R>(c: Constructor<R>): R;

  repo<R extends ObjectLiteral>(c: EntityClassOrSchema): Repository<R>;
}

export function useFullModule(): TestEnvironment {
  jest.setTimeout(120_000);

  const te: TestEnvironment = {
    module: (undefined as unknown) as any,
    containers: ({} as unknown) as any,
    ebus: ({} as unknown) as any,
    ebusSpy: ({} as unknown) as any,
    app: ({} as unknown) as any,
    service: ({} as unknown) as any,
    repo: ({} as unknown) as any,

    queryMocks: {},
  };

  afterEach(() => {
    te.ebusSpy.mockReset();
  });

  beforeAll(async () => {
    te.containers.pg = await new PostgreSqlContainer('postgres:16.4-bookworm')
      .withUsername('username')
      .withPassword('password')
      .start();

    te.containers.redis = await new RedisContainer('redis:7.4.0-alpine')
      .withPassword('redispass')
      .start();

    te.containers.rabbit = await new RabbitMQContainer('rabbitmq:management')
      .withEnvironment({
        RABBITMQ_USER: 'guest',
        RABBITMQ_PASSWORD: 'guest',
      })
      .start();

    te.queryMocks = {};

    te.module = await Test.createTestingModule({
      imports: [
        ScheduleModule.forRoot(),
        await ConfigModule.forRoot({
          isGlobal: true,
        }),
        CqrsModule.forRoot(),
        TypeOrmModule.forRoot({
          host: te.containers.pg.getHost(),
          port: te.containers.pg.getFirstMappedPort(),

          type: 'postgres',
          database: 'postgres',
          // logging: true,

          username: te.containers.pg.getUsername(),
          password: te.containers.pg.getPassword(),
          entities: Entities,
          migrations: ['dist/db/migrations/*.*'],
          migrationsRun: true,
          ssl: false,
        }),
        TypeOrmModule.forFeature(Entities),
        RabbitMQModule.forRootAsync({
          useFactory(): RabbitMQConfig {
            return {
              exchanges: [
                {
                  name: 'gameserver_exchange',
                  type: 'topic',
                },
              ],
              uri: te.containers.rabbit.getAmqpUrl(),
            };
          },
          imports: [],
          inject: [],
        }),
        ClientsModule.registerAsync([
          {
            name: 'QueryCore',
            useFactory(): RedisOptions {
              return {
                transport: Transport.REDIS,
                options: {
                  port: te.containers.redis.getPort(),
                  host: te.containers.redis.getHost(),
                  password: te.containers.redis.getPassword(),
                },
              };
            },
            inject: [],
            imports: [],
          },
          {
            name: 'GSCommands',
            useFactory(): RmqOptions {
              return {
                transport: Transport.RMQ,
                options: {
                  urls: [
                    {
                      hostname: te.containers.rabbit.getHost(),
                      port: te.containers.rabbit.getFirstMappedPort(),
                      protocol: 'amqp',
                      // username: te.containers.rabbit.getName(),
                      // password: te.containers.rabbit.pas(),
                    },
                  ],
                  queue: 'gameserver_commands',
                  queueOptions: {
                    durable: true,
                  },
                  prefetchCount: 5,
                },
              };
            },
            inject: [],
            imports: [],
          },
          {
            name: 'GSEvents',
            useFactory(): RmqOptions {
              return {
                transport: Transport.RMQ,
                options: {
                  urls: [
                    {
                      hostname: te.containers.rabbit.getHost(),
                      port: te.containers.rabbit.getFirstMappedPort(),
                      protocol: 'amqp',
                      // username: te.containers.rabbit.getName(),
                      // password: te.containers.rabbit.get(),
                    },
                  ],
                  queue: 'gameserver_events',
                  queueOptions: {
                    durable: true,
                  },
                  prefetchCount: 5,
                },
              };
            },
            inject: [],
            imports: [],
          },
        ]),
      ],
      providers: [
        BracketService,
        {
          provide: BracketsManager,
          useFactory: (crud: BracketCrud) => {
            return new BracketsManager(crud);
          },
          inject: [BracketCrud],
        },
        BracketMatchService,
        GameScheduleService,
        MatchGameService,
        TeamService,
        UtilQuery,
        TeamMapper,
        BracketMapper,
        TournamentMapper,
        BracketCrud,
      ],
      controllers: [TeamController, TournamentController],
    }).compile();

    te.app = await te.module.createNestApplication({
      logger: new WinstonWrapper('localhost', 7777, 'demo', true),
    });

    await te.app.listen(0);

    te.service = con => te.module.get(con);
    te.repo = con => te.module.get(getRepositoryToken(con));
    te.ebus = te.module.get(EventBus);
    te.ebusSpy = jest.spyOn(te.ebus, 'publish');
    // Mocks:
  });

  afterAll(async () => {
    await te.app.close();
    await te.containers.pg.stop();
    await te.containers.redis.stop();
  });

  return te;
}

export function testUser(): string {
  return Math.round(Math.random() * 1000000).toString();
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
