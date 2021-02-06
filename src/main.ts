import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BracketService } from './rest/tournament/bracket.service';
import { REDIS_PASSWORD, REDIS_URL } from './config/env';
import { Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  BracketEntryType,
  BracketType,
} from './gateway/shared-types/tournament';
import { TeamService } from './rest/tournament/team.service';

const teamName = [
  'form',
  'meek',
  'oval',
  'standing',
  'mean',
  'trouble',
  'tiger',
  'bat',
  'cautious',
  'quizzical',
  'whimsical',
  'dirt',
  'decorous',
  'division',
  'gaping',
  'grade',
  'teeny',
  'straight',
  'ludicrous',
  'nosy',
];
const mockedParticipants = [
  '[U:1:366411679]',
  '[U:1:924641625]',
  '[U:1:251215321]',
  '[U:1:1081775503]',
  '[U:1:401982721]',
  '[U:1:157787666]',
  // '[U:1:1174929366]',
  // '[U:1:906350541]',
  // '[U:1:120230466]',
  // '[U:1:234538375]',
  // '[U:1:128033448]',
  // '[U:1:926086531]',
  // '[U:1:1009677941]',
  // '[U:1:1047305324]',
  // '[U:1:97983264]',
  // '[U:1:114156536]',
  // '[U:1:1126102181]',
  // '[U:1:266002852]',
  // '[U:1:1013975412]',
  // '[U:1:430188284]',
  // '[U:1:299157539]',
  // '[U:1:1062901073]',
];

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
  await app.startAllMicroservicesAsync();
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

  // const tournTeam = await app
  //   .get<BracketService>(BracketService)
  //   .createTournament(
  //     'Test team tournament',
  //     BracketEntryType.PLAYER,
  //     new Date().getTime() + 1000 * 10, // in 10 seconds
  //     'https://upload.wikimedia.org/wikipedia/en/8/8e/The_International_logo_%282014%29.png',
  //     BracketType.SINGLE_ELIMINATION,
  //   );
  //
  //
  // let i = 0;
  // for (const steamId of mockedParticipants) {
  //   await app.get(BracketService).registerSoloPlayer(tournTeam.id, steamId);
  //   i++;
  // }
  //
  // await app
  //   .get<BracketService>(BracketService)
  //   .generateTournament(tournTeam.id);

}
bootstrap();
