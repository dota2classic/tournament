import { MigrationInterface, QueryRunner } from "typeorm";

export class Fixes1759906884364 implements MigrationInterface {
    name = 'Fixes1759906884364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bracket_participant_player" DROP CONSTRAINT "FK_edb0d53c3c1a4a60f8cc15ffd7c"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP CONSTRAINT "FK_55fa93eb6d33b2b9ffffd47fc69"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP CONSTRAINT "FK_dedef39e937243609c9304fccf7"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration_player" DROP CONSTRAINT "FK_5fceffc9ae34e3b97b9947fc0a8"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" DROP CONSTRAINT "FK_56fbf7f0bc1566cd006f4b9f9af"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" RENAME COLUMN "tournamentId" TO "tournament_id"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant_player" DROP COLUMN "bracketParticipantId"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP COLUMN "tournamentId"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP COLUMN "teamId"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration_player" DROP COLUMN "tournamentRegistrationId"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD "tournament_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bracket_participant_player" ADD CONSTRAINT "FK_c90a82b2d633a85048042c45417" FOREIGN KEY ("bracket_participant_id") REFERENCES "bracket_participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD CONSTRAINT "FK_ab51476d0e4dac5232b76afd3a2" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD CONSTRAINT "FK_fabaa8b15b8302043d0dee3191d" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_registration_player" ADD CONSTRAINT "FK_c87c36f0c414bb2b111fd6d0600" FOREIGN KEY ("tournament_registration_id") REFERENCES "tournament_registration"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_a5da7bbdc08c78db205a0349a7c" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_registration" DROP CONSTRAINT "FK_a5da7bbdc08c78db205a0349a7c"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration_player" DROP CONSTRAINT "FK_c87c36f0c414bb2b111fd6d0600"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP CONSTRAINT "FK_fabaa8b15b8302043d0dee3191d"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP CONSTRAINT "FK_ab51476d0e4dac5232b76afd3a2"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant_player" DROP CONSTRAINT "FK_c90a82b2d633a85048042c45417"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP COLUMN "tournament_id"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration_player" ADD "tournamentRegistrationId" integer`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD "teamId" uuid`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD "tournamentId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bracket_participant_player" ADD "bracketParticipantId" integer`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" RENAME COLUMN "tournament_id" TO "tournamentId"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_56fbf7f0bc1566cd006f4b9f9af" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_registration_player" ADD CONSTRAINT "FK_5fceffc9ae34e3b97b9947fc0a8" FOREIGN KEY ("tournamentRegistrationId") REFERENCES "tournament_registration"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD CONSTRAINT "FK_dedef39e937243609c9304fccf7" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD CONSTRAINT "FK_55fa93eb6d33b2b9ffffd47fc69" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bracket_participant_player" ADD CONSTRAINT "FK_edb0d53c3c1a4a60f8cc15ffd7c" FOREIGN KEY ("bracketParticipantId") REFERENCES "bracket_participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
