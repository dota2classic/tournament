import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { EventBus, ofType } from '@nestjs/cqrs';
import { ClientProxy } from '@nestjs/microservices';
import { TournamentGameReadyEvent } from './gateway/events/tournament/tournament-game-ready.event';
import { TournamentReadyCheckStartedEvent } from './gateway/events/tournament/tournament-ready-check-started.event';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { TournamentReadyCheckDeclinedEvent } from './gateway/events/tournament/tournament-ready-check-declined.event';
import { LobbyReadyEvent } from './gateway/events/lobby-ready.event';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private logger = new Logger(AppService.name);

  constructor(
    private readonly ebus: EventBus,
    @Inject('QueryCore') private readonly redisEventQueue: ClientProxy,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.redisEventQueue.connect();
    } catch (e) {}

    const publicEvents: any[] = [TournamentGameReadyEvent];

    this.ebus
      .pipe(ofType(...publicEvents))
      .subscribe(t => this.redisEventQueue.emit(t.constructor.name, t));

    this.ebus
      .pipe(
        ofType<any, any>(
          TournamentReadyCheckStartedEvent,
          TournamentReadyCheckDeclinedEvent,
          LobbyReadyEvent,
        ),
      )
      .subscribe(msg =>
        this.amqpConnection
          .publish('app.events', msg.constructor.name, msg)
          .then(() =>
            this.logger.log(`Published RMQ event ${msg.constructor.name}`),
          ),
      );
  }
}
