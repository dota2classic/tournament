import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduleStrategy1769381644493 implements MigrationInterface {
  name = 'ScheduleStrategy1769381644493';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament" RENAME COLUMN "bestOfConfig" to "best_of_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" ADD "schedule_strategy" text NOT NULL DEFAULT '{"gameBreakDurationSeconds":600,"gameDurationSeconds":3000}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament" DROP COLUMN "schedule_strategy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" RENAME COLUMN "best_of_config" to "bestOfConfig"`,
    );
  }
}
