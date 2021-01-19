import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { inspect } from 'util';
import { timeout } from 'rxjs/operators';

export class SimpleQuery {
  constructor(
    public readonly url: string,
    public readonly ping = Math.random().toString(),
  ) {}
}

export class SimpleQueryResponse {
  constructor(public readonly url: string, public readonly pong: string) {}
}

@Injectable()
export class AppService {
  constructor(
    @Inject('QueryCore') private readonly redisEventQueue: ClientProxy,
  ) {}

  async onApplicationBootstrap() {
    setInterval(() => {

      const some = this.redisEventQueue.send<SimpleQueryResponse, SimpleQuery>(
        SimpleQuery.name,
        new SimpleQuery('url1'),
      ).pipe(timeout(3000));

      some
        .toPromise()
        .then(e => {
          console.log('YYY result', inspect(e));
        })
        .catch(err => {
          console.error(inspect(err));
        });
    }, 3000)
  }
}
