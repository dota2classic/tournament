import { MigrationInterface, QueryRunner } from 'typeorm';

export class Scheduling1769295273962 implements MigrationInterface {
  name = 'Scheduling1769295273962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" RENAME COLUMN "externalMatchId" TO external_match_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" RENAME COLUMN "teamOffset" TO team_offset;`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" RENAME COLUMN "scheduledDate" TO scheduled_date;`,
    );

    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" DROP COLUMN "finished"`,
    );

    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" ADD "gameserver_scheduled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" DROP CONSTRAINT "PK_288ed1cb53c5452636dd859e594"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" ADD CONSTRAINT "PK_288ed1cb53c5452636dd859e594" PRIMARY KEY ("id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" RENAME COLUMN external_match_id to "externalMatchId";`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" RENAME COLUMN team_offset TO "teamOffset";`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" RENAME COLUMN scheduled_date TO "scheduledDate";`,
    );

    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" DROP CONSTRAINT "PK_288ed1cb53c5452636dd859e594"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" ADD "id" SERIAL NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" ADD CONSTRAINT "PK_288ed1cb53c5452636dd859e594" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" DROP COLUMN "gameserver_scheduled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_bracket_match_game" ADD "finished" boolean NOT NULL DEFAULT false`,
    );
  }
}
