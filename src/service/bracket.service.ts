import { Injectable } from '@nestjs/common';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { InputStage, Stage } from 'brackets-model';
import { shuffle } from '../util/shuffle';
import { BracketType } from '../gateway/shared-types/tournament';
import { padArrayToClosestPower } from '../util/arrays';
import { BracketsManager } from 'brackets-manager';
import { BracketMatchService } from './bracket-match.service';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';

@Injectable()
export class BracketService {
  constructor(
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
    @InjectRepository(TournamentParticipantEntity)
    private readonly tournamentParticipantEntityRepository: Repository<
      TournamentParticipantEntity
    >,
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<
      BracketMatchEntity
    >,
    private readonly manager: BracketsManager,
    private readonly bracketMatchService: BracketMatchService,
    private readonly ds: DataSource,
  ) {}

  public async generateBracket(tournamentId: number): Promise<Stage> {
    const tournament = await this.tournamentEntityRepository.findOne({
      where: {
        id: tournamentId,
      },
      relations: ['participants', 'participants.players', 'participants.team'],
    });

    if (!tournament) {
      throw new Error('Tournament not found');
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
        stage_id: stage.id,
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
}
