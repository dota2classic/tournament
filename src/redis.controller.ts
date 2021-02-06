import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { GetPlayerInfoQuery } from './gateway/queries/GetPlayerInfo/get-player-info.query';
import { GetPlayerInfoQueryResult } from './gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { Constructor, EventBus } from '@nestjs/cqrs';
import { MatchStartedEvent } from './gateway/events/match-started.event';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';

@Controller()
export class RedisController {
  constructor(private readonly ebus: EventBus) {}
  private readonly logger = new Logger(RedisController.name);

  private event<T>(constructor: Constructor<T>, data: any) {
    const buff = data;
    buff.__proto__ = constructor.prototype;
    this.ebus.publish(buff);
  }

  @EventPattern(MatchStartedEvent.name)
  async MatchStartedEvent(data: MatchStartedEvent) {
    this.event(MatchStartedEvent, data);
  }


  @EventPattern(GameResultsEvent.name)
  async GameResultsEvent(data: GameResultsEvent) {
    this.event(GameResultsEvent, data);
  }
}
