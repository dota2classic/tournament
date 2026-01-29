import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveExtraStatus1769719581064 implements MigrationInterface {
  name = 'RemoveExtraStatus1769719581064';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."tournament_registration_state" RENAME TO "tournament_registration_state_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_registration_state" AS ENUM('CREATED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'DECLINED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration_player" ALTER COLUMN "state" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration_player" ALTER COLUMN "state" TYPE "public"."tournament_registration_state" USING "state"::"text"::"public"."tournament_registration_state"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration_player" ALTER COLUMN "state" SET DEFAULT 'CREATED'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tournament_registration_state_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tournament_registration_state" RENAME TO "tournament_registration_state_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_registration_state" AS ENUM('CREATED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'DECLINED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" ALTER COLUMN "state" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" ALTER COLUMN "state" TYPE "public"."tournament_registration_state" USING "state"::"text"::"public"."tournament_registration_state"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" ALTER COLUMN "state" SET DEFAULT 'CREATED'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tournament_registration_state_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" ALTER COLUMN "image_url" SET DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tournament" ALTER COLUMN "image_url" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_registration_state_old" AS ENUM('CREATED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'DECLINED', 'TIMED_OUT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" ALTER COLUMN "state" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" ALTER COLUMN "state" TYPE "public"."tournament_registration_state_old" USING "state"::"text"::"public"."tournament_registration_state_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" ALTER COLUMN "state" SET DEFAULT 'CREATED'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tournament_registration_state"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tournament_registration_state_old" RENAME TO "tournament_registration_state"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_registration_state_old" AS ENUM('CREATED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'DECLINED', 'TIMED_OUT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration_player" ALTER COLUMN "state" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration_player" ALTER COLUMN "state" TYPE "public"."tournament_registration_state_old" USING "state"::"text"::"public"."tournament_registration_state_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration_player" ALTER COLUMN "state" SET DEFAULT 'CREATED'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tournament_registration_state"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."tournament_registration_state_old" RENAME TO "tournament_registration_state"`,
    );
  }
}
