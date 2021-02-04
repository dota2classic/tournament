import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetUserInfoQuery } from '../../gateway/queries/GetUserInfo/get-user-info.query';
import { PlayerId } from '../../gateway/shared-types/player-id';
import { GetUserInfoQueryResult } from '../../gateway/queries/GetUserInfo/get-user-info-query.result';
import { Role } from '../../gateway/shared-types/roles';
import { QueryCache } from 'd2c-rcaches';
import { REDIS_PASSWORD, REDIS_URL } from '../../config/env';


const host = REDIS_URL()
  .replace('redis://', '')
  .split(':')[0];

export function qCache<T, B>() {
  return new QueryCache<T, B>({
    url: REDIS_URL(),
    password: REDIS_PASSWORD(),
    ttl: 10,
  });
}


export class UserModel {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly avatar: string,
    public readonly roles: Role[]
  ) {

  }
}


@Injectable()
export class UserRepository {
  private readonly rcache: QueryCache<any, any>;
  constructor(private readonly qbus: QueryBus) {
    this.rcache = qCache();
  }

  async resolve(id: UserModel['id']): Promise<UserModel> {
    return this.qbus
      .execute<GetUserInfoQuery, GetUserInfoQueryResult>(
        new GetUserInfoQuery(new PlayerId(id)),
      )
      .then(t => {
        if (t){
          return new UserModel(t.id.value, t.name, t.avatar, t.roles);
        }
        else return undefined;
      });
  }

  public async name(id: UserModel['id']): Promise<string> {
    return this.resolve(id).then(t => t.name);
  }

  public async roles(id: UserModel['id']): Promise<Role[]> {
    return this.resolve(id)
      .then(t => t.roles)
      .catch(() => []);
  }

  public async avatar(id: UserModel['id']): Promise<string> {
    return this.resolve(id).then(t => t.avatar);
  }
}
