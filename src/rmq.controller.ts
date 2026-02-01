import { Controller, Logger } from '@nestjs/common';
import { CommandBus, Constructor, EventBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';
import { MatchFailedEvent } from './gateway/events/match-failed.event';

@Controller()
export class RmqController {
  private readonly logger = new Logger(RmqController.name);

  constructor(
    private readonly cbus: CommandBus,
    private readonly config: ConfigService,
    private readonly ebus: EventBus,
  ) {}

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: MatchFailedEvent.name,
    queue: `tournament.${MatchFailedEvent.name}`,
  })
  async MatchFailedEvent(data: MatchFailedEvent) {
    this.event(MatchFailedEvent, data);
  }

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: GameResultsEvent.name,
    queue: `tournament.${GameResultsEvent.name}`,
  })
  private async handleGameResults(msg: GameResultsEvent) {
    this.event(GameResultsEvent, msg);
  }

  private event<T>(constructor: Constructor<T>, data: any) {
    const buff = data;
    buff.__proto__ = constructor.prototype;
    this.ebus.publish(buff);
  }
}
