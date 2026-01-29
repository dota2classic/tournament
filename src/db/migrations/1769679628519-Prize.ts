import { MigrationInterface, QueryRunner } from 'typeorm';

export class Prize1769679628519 implements MigrationInterface {
  name = 'Prize1769679628519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament" RENAME COLUMN "imageUrl" to "image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" ADD "prize" character varying NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tournament" DROP COLUMN "prize"`);
    await queryRunner.query(
      `ALTER TABLE "tournament" RENAME COLUMN "image_url" to "imageUrl"`,
    );
  }
}
