import { MigrationInterface, QueryRunner } from 'typeorm';

export class PluginSettings1771506675994 implements MigrationInterface {
  name = 'PluginSettings1771506675994';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament" ADD "disable_runes" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" ADD "mid_tower_to_win" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" ADD "enable_ban_stage" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" ADD "mid_tower_kills_to_win" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament" DROP COLUMN "mid_tower_kills_to_win"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" DROP COLUMN "enable_ban_stage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" DROP COLUMN "mid_tower_to_win"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" DROP COLUMN "disable_runes"`,
    );
  }
}
