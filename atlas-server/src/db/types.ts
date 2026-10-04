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
import { RoutineTaskTable } from '../models/routine.model';
import { ImmichCacheTable } from '../models/immich.model';
import { AppMetadataTable } from '../models/metadata.model';
import { PaperlessDocumentsTable } from '../models/paperless.model';

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
  routine_tasks: RoutineTaskTable;
  immich_cache: ImmichCacheTable;
  paperless_documents: PaperlessDocumentsTable;
  app_metadata: AppMetadataTable;
}
