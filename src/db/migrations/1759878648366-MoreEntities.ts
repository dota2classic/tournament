import { MigrationInterface, QueryRunner } from "typeorm";

export class MoreEntities1759878648366 implements MigrationInterface {
    name = 'MoreEntities1759878648366'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP CONSTRAINT "FK_fabaa8b15b8302043d0dee3191d"`);
        await queryRunner.query(`CREATE TABLE "bracket_participant_player" ("steam_id" character varying NOT NULL, "bracket_participant_id" integer NOT NULL, "bracketParticipantId" integer, CONSTRAINT "PK_9e75b8477b780b50ff47b17e0d1" PRIMARY KEY ("steam_id", "bracket_participant_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tournament_registration_state" AS ENUM('CREATED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'DECLINED', 'TIMED_OUT')`);
        await queryRunner.query(`CREATE TABLE "tournament_registration_player" ("steam_id" character varying NOT NULL, "tournament_registration_id" integer NOT NULL, "state" "public"."tournament_registration_state" NOT NULL DEFAULT 'CREATED', "tournamentRegistrationId" integer, CONSTRAINT "PK_94bd63b0a0c44f680a07b827967" PRIMARY KEY ("steam_id", "tournament_registration_id"))`);
        await queryRunner.query(`CREATE TABLE "tournament_registration" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "team_id" uuid, "tournamentId" integer NOT NULL, "state" "public"."tournament_registration_state" NOT NULL DEFAULT 'CREATED', "teamId" uuid, CONSTRAINT "PK_b19e294100cdc953257ed93bbdc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP COLUMN "tournament_id"`);
        await queryRunner.query(`ALTER TABLE "tournament" DROP COLUMN "entryType"`);
        await queryRunner.query(`ALTER TABLE "tournament" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "tournament" DROP COLUMN "startDate"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD "team_id" uuid`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD "tournamentId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD "teamId" uuid`);
        await queryRunner.query(`ALTER TABLE "tournament" ADD "team_size" smallint NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."tournament_state" AS ENUM('DRAFT', 'PUBLISHED', 'REGISTRATION', 'READY_CHECK', 'IN_PROGRESS', 'FINISHED')`);
        await queryRunner.query(`ALTER TABLE "tournament" ADD "state" "public"."tournament_state" NOT NULL DEFAULT 'DRAFT'`);
        await queryRunner.query(`ALTER TABLE "tournament" ADD "start_date" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bracket_participant_player" ADD CONSTRAINT "FK_edb0d53c3c1a4a60f8cc15ffd7c" FOREIGN KEY ("bracketParticipantId") REFERENCES "bracket_participant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD CONSTRAINT "FK_dedef39e937243609c9304fccf7" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD CONSTRAINT "FK_55fa93eb6d33b2b9ffffd47fc69" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_registration_player" ADD CONSTRAINT "FK_5fceffc9ae34e3b97b9947fc0a8" FOREIGN KEY ("tournamentRegistrationId") REFERENCES "tournament_registration"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_bb4e0d3daa99edf5df08b25854a" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_56fbf7f0bc1566cd006f4b9f9af" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament_registration" DROP CONSTRAINT "FK_56fbf7f0bc1566cd006f4b9f9af"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration" DROP CONSTRAINT "FK_bb4e0d3daa99edf5df08b25854a"`);
        await queryRunner.query(`ALTER TABLE "tournament_registration_player" DROP CONSTRAINT "FK_5fceffc9ae34e3b97b9947fc0a8"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP CONSTRAINT "FK_55fa93eb6d33b2b9ffffd47fc69"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP CONSTRAINT "FK_dedef39e937243609c9304fccf7"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant_player" DROP CONSTRAINT "FK_edb0d53c3c1a4a60f8cc15ffd7c"`);
        await queryRunner.query(`ALTER TABLE "tournament" DROP COLUMN "start_date"`);
        await queryRunner.query(`ALTER TABLE "tournament" DROP COLUMN "state"`);
        await queryRunner.query(`DROP TYPE "public"."tournament_state"`);
        await queryRunner.query(`ALTER TABLE "tournament" DROP COLUMN "team_size"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP COLUMN "teamId"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP COLUMN "tournamentId"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" DROP COLUMN "team_id"`);
        await queryRunner.query(`ALTER TABLE "tournament" ADD "startDate" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tournament" ADD "status" character varying NOT NULL DEFAULT 'NEW'`);
        await queryRunner.query(`ALTER TABLE "tournament" ADD "entryType" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD "tournament_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`DROP TABLE "tournament_registration"`);
        await queryRunner.query(`DROP TYPE "public"."tournament_registration_state"`);
        await queryRunner.query(`DROP TABLE "tournament_registration_player"`);
        await queryRunner.query(`DROP TYPE "public"."tournament_registration_state"`);
        await queryRunner.query(`DROP TABLE "bracket_participant_player"`);
        await queryRunner.query(`ALTER TABLE "bracket_participant" ADD CONSTRAINT "FK_fabaa8b15b8302043d0dee3191d" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
