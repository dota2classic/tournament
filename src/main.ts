import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BracketService,
} from './rest/tournament/bracket.service';
import { REDIS_PASSWORD, REDIS_URL } from './config/env';
import { Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BracketEntryType, BracketType } from './gateway/shared-types/tournament';


const mockedParticipants =[
  "[U:1:366411679]",
  "[U:1:924641625]",
  "[U:1:251215321]",
  "[U:1:1081775503]",
  "[U:1:401982721]",
  "[U:1:157787666]",
  "[U:1:1174929366]",
  "[U:1:906350541]",
  "[U:1:120230466]",
  "[U:1:234538375]",
  "[U:1:128033448]",
  "[U:1:926086531]",
  "[U:1:1009677941]",
  "[U:1:1047305324]",
  "[U:1:97983264]",
  "[U:1:114156536]",
  "[U:1:1126102181]",
  "[U:1:266002852]",
  "[U:1:1013975412]",
  "[U:1:430188284]",
  "[U:1:299157539]",
]
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      url: REDIS_URL(),
      retryAttempts: Infinity,
      password: REDIS_PASSWORD(),
      retryDelay: 5000,
    },
  });
  //
  await app.startAllMicroservicesAsync()
  app.enableCors();


  const options = new DocumentBuilder()
    .setTitle('Public REST api for dota2classic')
    .setDescription('All stuff')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  await app.listen(6100);

  const t = await app
    .get<BracketService>(BracketService)
    .createTournament('Test tournament', BracketEntryType.PLAYER);
  // example 1x1 tournament
  await app
    .get<BracketService>(BracketService)
    .generateTournament(
      t.id,
      BracketType.SINGLE_ELIMINATION,
      BracketEntryType.PLAYER,
      [
        '[U:1:1176450421]',
        '[U:1:153961832]',
        '[U:1:428198131]',
        '[U:1:432471626]',
        '[U:1:305690166]',
        '[U:1:151486141]',
        '[U:1:147793130]',
      ],
    );


  await app.get<BracketService>(BracketService)
    .matchResults(t.id, 2, "[U:1:432471626]")
}
bootstrap();
