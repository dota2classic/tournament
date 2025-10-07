import { Injectable } from '@nestjs/common';
import { CrudInterface, OmitId, Table } from 'brackets-manager/dist/types';
import { BracketParticipantEntity } from '../db/entity/bracket-participant.entity';
import { Connection, In, Repository } from 'typeorm';
import { StageEntity } from '../db/entity/stage.entity';
import { GroupEntity } from '../db/entity/group.entity';
import { RoundEntity } from '../db/entity/round.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { InjectRepository } from '@nestjs/typeorm';

const mapTable = {
  participant: BracketParticipantEntity,
  stage: StageEntity,
  group: GroupEntity,
  round: RoundEntity,
  match: BracketMatchEntity,
};

export interface TournamentBracketInfo {
  participant: BracketParticipantEntity[];
  stage: StageEntity[];
  group: GroupEntity[];
  round: RoundEntity[];
  match: BracketMatchEntity[];
  tournament: TournamentEntity;
}

@Injectable()
export class BracketCrud implements CrudInterface {
  constructor(
    private readonly connection: Connection,
    @InjectRepository(TournamentEntity)
    private readonly tournamentEntityRepository: Repository<TournamentEntity>,
  ) {}

  delete<T>(table: Table, filter?: Partial<T>): Promise<boolean> {
    throw 'not implemented';
  }

  insert<T>(table: Table, value: OmitId<T>): Promise<number>;
  insert<T>(table: Table, values: OmitId<T>[]): Promise<boolean>;
  async insert(table: Table, value): Promise<number | boolean> {
    const rep = this.connection.getRepository(mapTable[table]);

    if (Array.isArray(value)) {
      await rep.save(value);
      return true;
    } else {
      const res = await rep.save(value);
      // @ts-ignore
      return res.id;
    }
  }
  select<T>(table: Table): Promise<T[] | null>;
  select<T>(table: Table, id: number | string): Promise<T | null>;
  select<T>(table: Table, filter: Partial<T>): Promise<T[] | null>;
  select(table: Table, id?): any {
    const rep = this.connection.getRepository(mapTable[table]);
    if (typeof id === 'object') {
      // its a filter
      return rep.find(id);
    } else if (typeof id === 'number') {
      return rep.findOneById(id);
    }
  }

  update<T>(table: Table, id: number, value: T): Promise<boolean>;
  update<T>(
    table: Table,
    filter: Partial<T>,
    value: Partial<T>,
  ): Promise<boolean>;
  async update(table: Table, id, value): Promise<boolean> {
    const rep = this.connection.getRepository(mapTable[table]);
    if (typeof id === 'object') throw 'not implemented';

    await rep.update(id, value);
    return true;
  }

  public async getBracket(tid: number): Promise<TournamentBracketInfo> {
    const participant = await this.select<BracketParticipantEntity>(
      'participant',
      { tournamentId: tid },
    );
    const stage = await this.select<StageEntity>('stage', {
      tournament_id: tid,
    });

    // @ts-ignore
    const group: GroupEntity[] = await this.select<GroupEntity>('group', {
      where: {
        stage_id: In(stage.map(t => t.id)),
      },
    });

    // @ts-ignore
    const round: RoundEntity[] = await this.select<RoundEntity>('round', {
      where: {
        stage_id: In(stage.map(t => t.id)),
      },
    });

    // @ts-ignore
    const match: BracketMatchEntity[] = await this.select<BracketMatchEntity>(
      'match',
      {
        where: { stage_id: In(stage.map(t => t.id)) },
      },
    );

    const tournament = await this.tournamentEntityRepository.findOneById(tid);

    match.sort((a, b) => a.number - b.number);

    return {
      participant,
      round,
      group,
      stage,
      match,
      tournament,
    };
  }
}
