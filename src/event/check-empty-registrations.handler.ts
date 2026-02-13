import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { CheckEmptyRegistrationsEvent } from './check-empty-registrations.event';

@EventsHandler(CheckEmptyRegistrationsEvent)
export class CheckEmptyRegistrationsHandler implements IEventHandler<CheckEmptyRegistrationsEvent> {
  constructor(private readonly ds: DataSource) {}

  async handle(event: CheckEmptyRegistrationsEvent) {
    await this.ds.query(`
    DELETE FROM tournament_registration r
    WHERE NOT EXISTS (
        SELECT 1
        FROM tournament_registration_player pr
        WHERE pr.tournament_registration_id = r.id
    );

    `);
  }
}
