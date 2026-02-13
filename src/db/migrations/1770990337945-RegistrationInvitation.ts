import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegistrationInvitation1770990337945 implements MigrationInterface {
  name = 'RegistrationInvitation1770990337945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "registration_invitation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "inviter_steam_id" character varying NOT NULL, "steam_id" character varying NOT NULL, "registration_id" integer NOT NULL, CONSTRAINT "PK_923ad569005f0b878067e1d2b94" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "registration_invitation"`);
  }
}
