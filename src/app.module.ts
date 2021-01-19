import { CacheModule, Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisController } from './redis.controller';
import { PlayerController } from './rest/player.controller';

@Module({
  imports: [
    CacheModule.register(),

    ClientsModule.register([
      {
        name: 'QueryCore',
        transport: Transport.REDIS,
        options: {
          url: 'redis://localhost:6379',
          retryAttempts: Infinity,
          retryDelay: 5000,
        },
      },
    ]),
  ],
  controllers: [PlayerController, RedisController],
  providers: [AppService],
})
export class AppModule {}
