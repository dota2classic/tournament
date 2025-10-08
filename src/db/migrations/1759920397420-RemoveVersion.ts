import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveVersion1759920397420 implements MigrationInterface {
    name = 'RemoveVersion1759920397420'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_registration" DROP CONSTRAINT "FK_bb4e0d3daa99edf5df08b25854a"`);
        await queryRunner.query(`ALTER TABLE "tournament" DROP COLUMN "version"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" DROP COLUMN "teamId"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_d687534a3856d0cc75dd354ffa4" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_registration" DROP CONSTRAINT "FK_d687534a3856d0cc75dd354ffa4"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" ADD "teamId" uuid`);
        await queryRunner.query(`ALTER TABLE "tournament" ADD "version" character varying NOT NULL DEFAULT 'Dota_684'`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_bb4e0d3daa99edf5df08b25854a" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
