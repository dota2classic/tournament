import { Injectable } from '@nestjs/common';
import { TournamentDto } from '../../rest/dto/tournament.dto';
import { StageEntity } from '../../db/entity/stage.entity';
import { BracketMatchEntity } from '../../db/entity/bracket-match.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UtilQuery {


  constructor(
    @InjectRepository(BracketMatchEntity)
    private readonly bracketMatchEntityRepository: Repository<BracketMatchEntity>,
  ) {
  }



  public async matchTournamentId(mid: number): Promise<number> {
    const query = this.bracketMatchEntityRepository
      .createQueryBuilder('bm')
      .where('bm.id = :id', { id: mid })
      .leftJoinAndMapOne(
        'bm.stage',
        StageEntity,
        'stage',
        'stage.id = bm.stage_id',
      );
    const match = await query.getOne();
    return match.stage?.tournament_id
  }


}
