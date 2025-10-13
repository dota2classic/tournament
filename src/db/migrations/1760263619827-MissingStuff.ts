import { MigrationInterface, QueryRunner } from "typeorm";

export class MissingStuff1760263619827 implements MigrationInterface {
    name = 'MissingStuff1760263619827'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_participant_player" DROP CONSTRAINT "FK_df36ed2306f8ee813151a4827f4"`);
        await queryRunner.query(`CREATE TYPE "public"."tournament_match_status" AS ENUM('0', '1', '2', '3', '4', '5')`);
        await queryRunner.query(`CREATE TABLE "tournament_bracket_match" ("id" SERIAL NOT NULL, "stage_id" integer NOT NULL, "group_id" integer NOT NULL, "round_id" integer NOT NULL, "child_count" integer NOT NULL, "number" integer NOT NULL, "status" "public"."tournament_match_status" NOT NULL DEFAULT '0', "scheduledDate" TIMESTAMP WITH TIME ZONE, "opponent1" text, "opponent2" text, CONSTRAINT "PK_5bc3bd69d86c259abb498778f45" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tournament_bracket_match_game" ("id" SERIAL NOT NULL, "bm_id" integer NOT NULL, "number" integer NOT NULL, "externalMatchId" integer, "teamOffset" integer NOT NULL DEFAULT '0', "finished" boolean NOT NULL DEFAULT false, "scheduledDate" TIMESTAMP, "opponent1" jsonb, "opponent2" jsonb, "parent_id" integer NOT NULL, "stage_id" integer NOT NULL, "status" "public"."tournament_match_status" NOT NULL DEFAULT '0', CONSTRAINT "PK_288ed1cb53c5452636dd859e594" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "tournament_participant_player" DROP COLUMN "bracket_participant_id"`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match" ADD CONSTRAINT "FK_e561127e97cc9d2d60042883274" FOREIGN KEY ("stage_id") REFERENCES "tournament_stage"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match" ADD CONSTRAINT "FK_711333cff612043f6333f0d3407" FOREIGN KEY ("group_id") REFERENCES "tournament_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match" ADD CONSTRAINT "FK_572e5888e3f44468fcd0fc0103f" FOREIGN KEY ("round_id") REFERENCES "tournament_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match_game" ADD CONSTRAINT "FK_71de7ed9cd17465fc77f318f3b3" FOREIGN KEY ("bm_id") REFERENCES "tournament_bracket_match"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_participant_player" ADD CONSTRAINT "FK_02a8f5e8c461a655b545018fb20" FOREIGN KEY ("tournament_participant_id") REFERENCES "tournament_participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_participant_player" DROP CONSTRAINT "FK_02a8f5e8c461a655b545018fb20"`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match_game" DROP CONSTRAINT "FK_71de7ed9cd17465fc77f318f3b3"`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match" DROP CONSTRAINT "FK_572e5888e3f44468fcd0fc0103f"`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match" DROP CONSTRAINT "FK_711333cff612043f6333f0d3407"`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match" DROP CONSTRAINT "FK_e561127e97cc9d2d60042883274"`);
        await queryRunner.query(`ALTER TABLE "tournament_participant_player" ADD "bracket_participant_id" integer`);
        await queryRunner.query(`DROP TABLE "tournament_bracket_match_game"`);
        await queryRunner.query(`DROP TYPE "public"."tournament_match_status"`);
        await queryRunner.query(`DROP TABLE "tournament_bracket_match"`);
        await queryRunner.query(`ALTER TABLE "tournament_participant_player" ADD CONSTRAINT "FK_df36ed2306f8ee813151a4827f4" FOREIGN KEY ("bracket_participant_id") REFERENCES "tournament_participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
