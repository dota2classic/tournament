import { Injectable } from '@nestjs/common';
import { CrudInterface, OmitId, Table } from 'brackets-manager/dist/types';
import { TournamentParticipantEntity } from '../db/entity/tournament-participant.entity';
import { Connection, In, Repository } from 'typeorm';
import { StageEntity } from '../db/entity/stage.entity';
import { GroupEntity } from '../db/entity/group.entity';
import { RoundEntity } from '../db/entity/round.entity';
import { BracketMatchEntity } from '../db/entity/bracket-match.entity';
import { TournamentEntity } from '../db/entity/tournament.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { BracketMatchGameEntity } from '../db/entity/bracket-match-game.entity';

const mapTable = {
  participant: TournamentParticipantEntity,
  stage: StageEntity,
  group: GroupEntity,
  round: RoundEntity,
  match: BracketMatchEntity,
  match_game: BracketMatchGameEntity,
};

export interface TournamentBracketInfo {
  participant: TournamentParticipantEntity[];
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
    console.log(`delete table ${table} with filter`, filter);
    throw 'not implemented';
  }

  insert<T>(table: Table, value: OmitId<T>): Promise<number>;
  insert<T>(table: Table, values: OmitId<T>[]): Promise<boolean>;
  async insert(table: Table, value): Promise<number | boolean> {
    console.log(`Insert table ${table} with data`, value);
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
    console.log(`Select table ${table} by `, id);
    const rep = this.connection.getRepository(mapTable[table]);
    if (typeof id === 'object') {
      // its a filter
      return rep.find({
        where: id,
      });
    } else if (typeof id === 'number') {
      return rep.findOneBy({ id });
    }
  }

  update<T>(table: Table, id: number | string, value: T): Promise<boolean>;
  update<T>(
    table: Table,
    filter: Partial<T>,
    value: Partial<T>,
  ): Promise<boolean>;
  async update(table: Table, id, value): Promise<boolean> {
    console.log(`Update table ${table}`, id, ` with data`, value);
    // id is either id or criteria

    if (table === 'match_game') {
      const rep: Repository<BracketMatchGameEntity> = this.connection.getRepository(
        mapTable[table],
      );
      // HERE WE NEED TO IMPLEMENT A DOGSHIT DEEP MERGE
      const gamesToUpdate: BracketMatchGameEntity[] = [];
      if (typeof id === 'number') {
        gamesToUpdate.push(await this.select(table, id));
      } else {
        const entities: BracketMatchGameEntity[] = await this.select(table, id);
        gamesToUpdate.push(...entities);
      }
      for (let existing of gamesToUpdate) {
        for (const key in value) {
          if (
            existing[key] &&
            typeof existing[key] === 'object' &&
            typeof value[key] === 'object' &&
            key.startsWith('opponent')
          ) {
            Object.assign(existing[key], value[key]); // For opponent objects, this does a deep merge of level 2.
          } else {
            existing[key] = value[key]; // Otherwise, do a simple value assignment.
          }
        }
      }

      await rep.save(gamesToUpdate);
    } else {
      const rep = this.connection.getRepository(mapTable[table]);
      await rep.update(id, value);
    }
    return true;
  }

  public async getBracket(tid: number): Promise<TournamentBracketInfo> {
    const participant = await this.select<TournamentParticipantEntity>(
      'participant',
      { tournament_id: tid },
    );
    const stage = await this.select<StageEntity>('stage', {
      tournament_id: tid,
    });

    // @ts-ignore
    const group: GroupEntity[] = await this.select<GroupEntity>('group', {
      stage_id: In(stage.map(t => t.id)),
    });

    // @ts-ignore
    const round: RoundEntity[] = await this.select<RoundEntity>('round', {
      stage_id: In(stage.map(t => t.id)),
    });

    // @ts-ignore
    const match: BracketMatchEntity[] = await this.select<BracketMatchEntity>(
      'match',
      { stage_id: In(stage.map(t => t.id)) },
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
