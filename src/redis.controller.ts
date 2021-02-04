import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GetPlayerInfoQuery } from './gateway/queries/GetPlayerInfo/get-player-info.query';
import { GetPlayerInfoQueryResult } from './gateway/queries/GetPlayerInfo/get-player-info-query.result';

@Controller()
export class RedisController {
  constructor() {}


}
