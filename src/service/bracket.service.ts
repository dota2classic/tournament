import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DataSource, Repository } from 'typeorm';

import { BracketsManager } from 'brackets-manager';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketType } from '../gateway/shared-types/tournament';
import { BracketMatchService } from './bracket-match.service';
import { StageEntity } from '../db/entity/stage.entity';
import { EventBus } from '@nestjs/cqrs';
import { TournamentRepository } from '../repository/tournament.repository';
import { InputStage, Stage } from 'brackets-model';
import { shuffle } from '../util/shuffle';
import { padArrayToClosestPower } from '../util/arrays';
import { BracketUpdatedEvent } from '../event/bracket-updated.event';

export type EntryIdType = string;

@Injectable()
export class BracketService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    private readonly bracketMatchService: BracketMatchService,
    private readonly manager: BracketsManager,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    @InjectRepository(StageEntity)
    private readonly stageEntityRepository: Repository<StageEntity>,
    private readonly ebus: EventBus,
    private readonly utilQuery: TournamentRepository,
  ) {}

  public async generateBracket(tournamentId: number): Promise<Stage> {
    const tournament = await this.tournamentEntityRepository.findOne({
      where: {
        id: tournamentId,
      },
      relations: [
        'participants',
        'participants.players',
        'participants.team',
        'stages',
      ],
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.stages.length > 0) {
      throw new BadRequestException('Bracket already generated');
    }

    const participants = tournament.participants;

    // it's just stupid to do this right
    if (participants.length < Math.pow(2, 2)) return;

    const preparedParticipants: number[] = participants.map(p => p.id);

    const stageSetup: InputStage = {
      name: 'Example',
      tournamentId,
      type:
        tournament.strategy === BracketType.DOUBLE_ELIMINATION
          ? 'double_elimination'
          : 'single_elimination',
      seeding: shuffle(padArrayToClosestPower(preparedParticipants)),
      settings: {
        grandFinal: 'simple',
      },
    };

    const stage = await this.manager.create(stageSetup);

    const allMatches = await this.bracketMatchEntityRepository.find({
      where: {
        stage_id: Number(stage.id),
      },
    });



    // Create game/games for each match
    await this.ds.transaction(async tx => {
      return await Promise.all(
        allMatches.map(async m =>
          this.bracketMatchService.generateGames(tournament, m, tx),
        ),
      );
    });

    // TODO
    // await Promise.all(
    //   allMatches.map(async m =>
    //     this.bracketMatchService.scheduleBracketMatch(tournamentId, m.id),
    //   ),
    // );
    return stage;
  }

  public async setMatchResults(matchId: number, winnerOpponentId: number) {
    const m: BracketMatchEntity = await this.bracketMatchEntityRepository.findOne(
      {
        where: {
          id: matchId,
        },
      },
    );
    if (m.opponent1?.id === winnerOpponentId) {
      m.opponent1.result = 'win';
    } else if (m.opponent2?.id === winnerOpponentId) {
      m.opponent2.result = 'win';
    } else {
      throw new Error(`No such opponent in match ${matchId}`);
    }

    await this.manager.update.match({
      id: m.id,
      opponent1: m.opponent1,
      opponent2: m.opponent2,
    });

    this.ebus.publish(
      new BracketUpdatedEvent(
        await this.utilQuery.matchTournamentId(matchId),
        matchId,
        -1,
      ),
    );
  }
}
