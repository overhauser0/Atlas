// atlas-server/src/db/types.ts
import {
  LocalPiecesTable,
  NotionPiecesCacheTable,
} from '../models/piece.model';
import { AiAgentsTable } from '../models/agent.model';
import { DiaryTable } from '../models/diary.model';
import { NotificationsTable } from '../models/push.model';
import { DbGoogleEvent } from '../models/calendar.model';
import { LocalNotesTable } from '../models/note.model';
import { AppMetadataTable } from '../models/metadata.model';

// ==========================================
// Database インターフェース (Kysely全体スキーマ)
// ==========================================
export interface Database {
  local_pieces: LocalPiecesTable;
  notion_pieces_cache: NotionPiecesCacheTable;
  ai_agents: AiAgentsTable;
  diaries: DiaryTable;
  notifications: NotificationsTable;
  google_events: DbGoogleEvent;
  local_notes: LocalNotesTable;
  app_metadata: AppMetadataTable;
}
