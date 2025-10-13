import { MigrationInterface, QueryRunner } from "typeorm";

export class Fixes1760302205181 implements MigrationInterface {
    name = 'Fixes1760302205181'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match_game" DROP CONSTRAINT "FK_71de7ed9cd17465fc77f318f3b3"`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match_game" DROP COLUMN "bm_id"`);
        await queryRunner.query(`ALTER TABLE "tournament_stage" ADD CONSTRAINT "FK_7acf5fc2132f5744c25b129b2c0" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match_game" ADD CONSTRAINT "FK_e38a7f67ef3003609076b0c9c1b" FOREIGN KEY ("parent_id") REFERENCES "tournament_bracket_match"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match_game" DROP CONSTRAINT "FK_e38a7f67ef3003609076b0c9c1b"`);
        await queryRunner.query(`ALTER TABLE "tournament_stage" DROP CONSTRAINT "FK_7acf5fc2132f5744c25b129b2c0"`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match_game" ADD "bm_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tournament_bracket_match_game" ADD CONSTRAINT "FK_71de7ed9cd17465fc77f318f3b3" FOREIGN KEY ("bm_id") REFERENCES "tournament_bracket_match"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
