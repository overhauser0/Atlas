// atlas-server/src/schemas/calendar.schema.ts

import { Generated } from 'kysely';

export interface DbGoogleEvent {
  id: string;
  title: string;
  note: string | null;
  date: string | null;
  url: string | null;
  synced_at: Generated<Date>;
}
