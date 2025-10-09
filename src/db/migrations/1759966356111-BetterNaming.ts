import { MigrationInterface, QueryRunner } from "typeorm";

export class BetterNaming1759966356111 implements MigrationInterface {
    name = 'BetterNaming1759966356111'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_participant" RENAME COLUMN "name" TO "team_id"`);
        await queryRunner.query(`CREATE TABLE "tournament_participant_player" ("steam_id" character varying NOT NULL, "tournament_participant_id" integer NOT NULL, "bracket_participant_id" integer, CONSTRAINT "PK_cc186d18f36fe566546c79b771f" PRIMARY KEY ("steam_id", "tournament_participant_id"))`);
        await queryRunner.query(`ALTER TABLE "tournament_participant" DROP COLUMN "team_id"`);
        await queryRunner.query(`ALTER TABLE "tournament_participant" ADD "team_id" uuid`);
        await queryRunner.query(`ALTER TABLE "tournament_participant_player" ADD CONSTRAINT "FK_df36ed2306f8ee813151a4827f4" FOREIGN KEY ("bracket_participant_id") REFERENCES "tournament_participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_participant" ADD CONSTRAINT "FK_a2a9dbc96ad20a714242865d32b" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_participant" DROP CONSTRAINT "FK_a2a9dbc96ad20a714242865d32b"`);
        await queryRunner.query(`ALTER TABLE "tournament_participant_player" DROP CONSTRAINT "FK_df36ed2306f8ee813151a4827f4"`);
        await queryRunner.query(`ALTER TABLE "tournament_participant" DROP COLUMN "team_id"`);
        await queryRunner.query(`ALTER TABLE "tournament_participant" ADD "team_id" character varying NOT NULL`);
        await queryRunner.query(`DROP TABLE "tournament_participant_player"`);
        await queryRunner.query(`ALTER TABLE "tournament_participant" RENAME COLUMN "team_id" TO "name"`);
    }

}
