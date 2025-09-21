import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1758453479012 implements MigrationInterface {
    name = 'Initial1758453479012'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tournament_match_game" ("id" SERIAL NOT NULL, "bm_id" integer NOT NULL, "number" integer NOT NULL, "externalMatchId" integer, "teamOffset" integer NOT NULL DEFAULT '0', "finished" boolean NOT NULL DEFAULT false, "scheduledDate" TIMESTAMP, "winner" integer, "loser" integer, CONSTRAINT "PK_72b4ddc894f5472533f313cd934" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "bracket_participant" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "tournament_id" integer NOT NULL, CONSTRAINT "PK_8f7b938104e11e720e7b910fe74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tournament" ("id" SERIAL NOT NULL, "entryType" character varying NOT NULL, "name" character varying NOT NULL, "version" character varying NOT NULL DEFAULT 'Dota_684', "status" character varying NOT NULL DEFAULT 'NEW', "strategy" character varying NOT NULL, "description" character varying NOT NULL DEFAULT '', "imageUrl" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "startDate" TIMESTAMP NOT NULL, "bestOfConfig" text NOT NULL DEFAULT '{"round":1,"final":1,"grandFinal":1}', CONSTRAINT "PK_449f912ba2b62be003f0c22e767" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tournament_participant" ("id" SERIAL NOT NULL, "tournament_id" integer NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_08e3ff49d0d130f1af3e0ec400f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "team_member" ("id" SERIAL NOT NULL, "steam_id" character varying NOT NULL, "teamId" uuid NOT NULL, CONSTRAINT "PK_649680684d72a20d279641469c5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "team" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creator" character varying NOT NULL, "name" character varying NOT NULL, "tag" character varying NOT NULL, "archived" boolean NOT NULL DEFAULT false, "locked" boolean NOT NULL DEFAULT false, "imageUrl" character varying NOT NULL, CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "team_invitation" ("id" SERIAL NOT NULL, "teamId" uuid NOT NULL, "steam_id" character varying NOT NULL, CONSTRAINT "PK_c48efb7b43f421266fbc29298f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tournament_group" ("id" SERIAL NOT NULL, "stage_id" integer NOT NULL, "number" integer NOT NULL, CONSTRAINT "PK_883d0f06ebb0aae64d7eb61124e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tournament_round" ("id" SERIAL NOT NULL, "number" integer NOT NULL, "stage_id" integer NOT NULL, "group_id" integer NOT NULL, CONSTRAINT "PK_40931a39f30039b3de581bf4806" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "bracket_match" ("id" SERIAL NOT NULL, "stage_id" integer NOT NULL, "group_id" integer NOT NULL, "round_id" integer NOT NULL, "child_count" integer NOT NULL, "number" integer NOT NULL, "status" integer NOT NULL, "scheduledDate" TIMESTAMP WITH TIME ZONE, "opponent1" text, "opponent2" text, CONSTRAINT "PK_529940064b1cfe321113d9a3c37" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tournament_stage" ("id" SERIAL NOT NULL, "tournament_id" integer NOT NULL, "name" character varying NOT NULL, "type" character varying NOT NULL, "number" integer NOT NULL, "settings" text NOT NULL, CONSTRAINT "PK_39511e7ae4daaa7296df59d6a77" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD CONSTRAINT "FK_fabaa8b15b8302043d0dee3191d" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_participant" ADD CONSTRAINT "FK_812798e7c998f0d3e750b36c969" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_member" ADD CONSTRAINT "FK_74da8f612921485e1005dc8e225" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_invitation" ADD CONSTRAINT "FK_f3d2441efc544a7cc085bdb6701" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bracket_match" ADD CONSTRAINT "FK_b16c9bd493fa8e4d42504a897a2" FOREIGN KEY ("group_id") REFERENCES "tournament_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bracket_match" ADD CONSTRAINT "FK_746b50d0f66671686cb6aa8189e" FOREIGN KEY ("round_id") REFERENCES "tournament_round"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bracket_match" DROP CONSTRAINT "FK_746b50d0f66671686cb6aa8189e"`);
        await queryRunner.query(`ALTER TABLE "bracket_match" DROP CONSTRAINT "FK_b16c9bd493fa8e4d42504a897a2"`);
        await queryRunner.query(`ALTER TABLE "team_invitation" DROP CONSTRAINT "FK_f3d2441efc544a7cc085bdb6701"`);
        await queryRunner.query(`ALTER TABLE "team_member" DROP CONSTRAINT "FK_74da8f612921485e1005dc8e225"`);
        await queryRunner.query(`ALTER TABLE "tournament_participant" DROP CONSTRAINT "FK_812798e7c998f0d3e750b36c969"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP CONSTRAINT "FK_fabaa8b15b8302043d0dee3191d"`);
        await queryRunner.query(`DROP TABLE "tournament_stage"`);
        await queryRunner.query(`DROP TABLE "bracket_match"`);
        await queryRunner.query(`DROP TABLE "tournament_round"`);
        await queryRunner.query(`DROP TABLE "tournament_group"`);
        await queryRunner.query(`DROP TABLE "team_invitation"`);
        await queryRunner.query(`DROP TABLE "team"`);
        await queryRunner.query(`DROP TABLE "team_member"`);
        await queryRunner.query(`DROP TABLE "tournament_participant"`);
        await queryRunner.query(`DROP TABLE "tournament"`);
        await queryRunner.query(`DROP TABLE "bracket_participant"`);
        await queryRunner.query(`DROP TABLE "tournament_match_game"`);
    }

}
