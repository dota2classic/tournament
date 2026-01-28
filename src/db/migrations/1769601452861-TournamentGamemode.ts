import { MigrationInterface, QueryRunner } from 'typeorm';

export class TournamentGamemode1769601452861 implements MigrationInterface {
  name = 'TournamentGamemode1769601452861';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament" ADD "game_mode" smallint NOT NULL DEFAULT '2'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tournament" DROP COLUMN "game_mode"`);
  }
}
