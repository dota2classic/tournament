import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentId1770991157453 implements MigrationInterface {
  name = 'AddTournamentId1770991157453';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registration_invitation" ADD "tournament_id" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "registration_invitation" ADD CONSTRAINT "FK_6c2610ed1632857a28a9f4a5fbf" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registration_invitation" DROP CONSTRAINT "FK_6c2610ed1632857a28a9f4a5fbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registration_invitation" DROP COLUMN "tournament_id"`,
    );
  }
}
