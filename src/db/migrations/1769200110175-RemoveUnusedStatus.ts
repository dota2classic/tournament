import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUnusedStatus1769200110175 implements MigrationInterface {
    name = 'RemoveUnusedStatus1769200110175'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."tournament_state" RENAME TO "tournament_state_old"`);
        await queryRunner.query(`CREATE TYPE "public"."tournament_state" AS ENUM('DRAFT', 'REGISTRATION', 'READY_CHECK', 'IN_PROGRESS', 'FINISHED')`);
        await queryRunner.query(`update tournament set state = 'REGISTRATION' where state = 'PUBLISHED'`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "state" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "state" TYPE "public"."tournament_state" USING "state"::"text"::"public"."tournament_state"`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "state" SET DEFAULT 'DRAFT'`);
        await queryRunner.query(`DROP TYPE "public"."tournament_state_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tournament_state_old" AS ENUM('DRAFT', 'PUBLISHED', 'REGISTRATION', 'READY_CHECK', 'IN_PROGRESS', 'FINISHED')`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "state" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "state" TYPE "public"."tournament_state_old" USING "state"::"text"::"public"."tournament_state_old"`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "state" SET DEFAULT 'DRAFT'`);
        await queryRunner.query(`DROP TYPE "public"."tournament_state"`);
        await queryRunner.query(`ALTER TYPE "public"."tournament_state_old" RENAME TO "tournament_state"`);
    }

}
