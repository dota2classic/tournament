import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      url: 'redis://localhost:6379',
      retryAttempts: Infinity,
      retryDelay: 5000,
    },
  });

  await app.startAllMicroservicesAsync()
  await app.listen(5423);


}
bootstrap();
