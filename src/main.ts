import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BracketService } from './tournament/service/bracket.service';
import { REDIS_PASSWORD, REDIS_URL } from './config/env';
import { Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BracketMatchService } from './tournament/service/bracket-match.service';
import { BracketEntryType, BracketType } from './gateway/shared-types/tournament';
import { MatchGameService } from './tournament/service/match-game.service';
import { TeamService } from './tournament/service/team.service';

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
  '[U:1:1174929366]',
  '[U:1:906350541]',
  '[U:1:120230466]',
  '[U:1:234538375]',
  '[U:1:128033448]',
  '[U:1:926086531]',
  '[U:1:1009677941]',
  '[U:1:1047305324]',
  '[U:1:97983264]',
  '[U:1:114156536]',
  '[U:1:1126102181]',
  '[U:1:266002852]',
  '[U:1:1013975412]',
  '[U:1:430188284]',
  '[U:1:299157539]',
  '[U:1:1062901073]',
];

const teamSetup = [
  {
    name: 'Natus Vincere',
    image: 'https://upload.wikimedia.org/wikipedia/ru/2/2c/NAVI_logo.png',
  },
  {
    name: 'OG',
    image:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6ZetJTKQUJGtlZLMyuOcOwTTWvZ0SPZDPSQ&usqp=CAU',
  },
  {
    name: 'Newbie',
    image:
      'https://pbs.twimg.com/profile_images/1188592322520457216/QkDOedua_400x400.jpg',
  },
  {
    name: 'Virtus Pro',
    image:
      'https://s-cdn.sportbox.ru/images/styles/upload/fp_fotos/a2/8b/63ecbc575d3dea523e5e0b0a8bc47b115bed63fef10f2304998691.jpg',
  },
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
  const bs = await app.get(BracketService);
  const ts = await app.get(TeamService);
  const mgs = await app.get(MatchGameService);

  await app.get(BracketMatchService).scheduleMatches();
  // await bs.getStandings(2)

  // const t = await bs.createTournament(
  //   'Team tournament',
  //   BracketEntryType.TEAM,
  //   new Date().getTime() + 1000 * 60 * 60, // in an hour
  //   'https://dota2classic.ru/api/static/icons/vk1.png',
  //   BracketType.SINGLE_ELIMINATION,
  //   { round: 1, final: 1, grandFinal: 1 },
  // );
  //
  // await ts.createTeam(
  //   'Uchiha gang',
  //   'UG',
  //   'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Mangekyou_Sharingan_Shisui.svg/1200px-Mangekyou_Sharingan_Shisui.svg.png',
  //   '[U:1:1062901073]',
  // );
  //
  // for (let i = 0; i < 4; i++) {
  //   const startOffset = i * 5;
  //   const team = await ts.createTeam(
  //     teamSetup[i].name,
  //     `Team${i}`,
  //     teamSetup[i].image,
  //     mockedParticipants[startOffset],
  //   );
  //
  //   for (let j = 1; j < 5; j++) {
  //     await ts.joinTeam(team.id, mockedParticipants[startOffset + j]);
  //   }
  //   await bs.registerTeam(t.id, team.id);
  // }
  //
  // await bs.generateTournament(t.id);
}
bootstrap();
