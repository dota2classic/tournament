import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { TypeOrmModule } from '@nestjs/typeorm';

export const typeorm = (container: StartedPostgreSqlContainer, Entities: any[]) => [
  TypeOrmModule.forRoot({
    host: container.getHost(),
    port: container.getFirstMappedPort(),

    type: "postgres",
    database: "postgres",

    username: container.getUsername(),
    password: container.getPassword(),
    entities: Entities,
    synchronize: true,
    dropSchema: false,
    ssl: false,
  }),
  TypeOrmModule.forFeature(Entities),
]
