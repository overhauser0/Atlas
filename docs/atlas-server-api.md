# Atlas Server API

Atlas Server の HTTP API リファレンスです。内容は現在のルート登録とコントローラー／モデルの実装に基づきます。

## 基本情報

- Base URL: `http://<host>:5675`
- API prefix: `/api/v1`
- リクエスト／レスポンス: JSON（サムネイルと Paperless 文書表示を除く）
- `/api/v1/*` の全エンドポイントで `X-API-KEY: <ATLAS_API_KEY>` が必要です。
- `/health`、`/auth/verify`、`/paperless/view` はこの API キー認証の対象外です。`/paperless/view` は代わりに一回限りの ticket を要求します。
- JSON を送る場合は `Content-Type: application/json` を指定してください。Paperless のアップロードは `multipart/form-data` です。
- `CORS_ALLOWED_ORIGINS`（カンマ区切り）を設定すると、指定されたオリジンのみ CORS 許可されます。

## 共通・認証

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/health` | なし | `{ "status": "UP", "time": "<日時>" }` |
| `POST` | `/auth/verify` | JSON: `{ "password": string }` | `{ "success": true }` |

`POST /auth/verify` は `ATLAS_PASSWORD` と定数時間で照合します。不一致またはサーバー側パスワード未設定時は `401 { "success": false, "error": "Invalid password" }` を返します。同一 IP から 15 分間に 10 回連続失敗した場合は `429`（`Retry-After` ヘッダー付き）を返します。

## Notifications

Push の入力フィールド: `title`（必須）、`note`、`category`（`TASK` / `ALERT` / `INFO`）、`storageTarget`（`NOTION` / `LOCAL` / 空文字）、`url`、`metadata`（任意の拡張データ）、`timestamp`（ISO datetime）。省略可能フィールドにはサーバー側の既定値があります。

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `POST` | `/api/v1/push` | JSON: Push 入力フィールド | `202 { "status": "ACCEPTED", "data": <処理結果> }` |
| `GET` | `/api/v1/notifications` | Query: `limit`（既定50）, `offset`（既定0）, `isRead`（`true` / `false`） | `{ "status": "OK", "notifications": Notification[] }` |
| `POST` | `/api/v1/notifications/read` | なし | `{ "message": "All notifications marked as read" }` |
| `POST` | `/api/v1/notifications/:id/read` | Path: `id` | `{ "notification": Notification }` |

`POST /api/v1/notifications/:id/read` は対象がなければ `404`、Push の入力不正は `400` です。

## Pieces（タスク／アイテム）

`Piece` の主なフィールド: `title`（必須）、`note`、`status`（`INBOX` / `Waiting` / `Going` / `Wrapper` / `Canceled` / `Done`）、`source`（`NOTION` / `LOCAL`）、`start_date` / `end_date`（`YYYY-MM-DD`）、`start_time` / `end_time`、`area`（`Work` / `Life`）、`type`（`Task` / `Note` / `Event` / `Memo`）、`topics` / `flags` / `fkw` / `prefs`（文字列配列）、`url`、`parent_id`。日付・時刻や任意項目は `null` または省略可能です。作成・更新ではモデルによるバリデーションが行われます。

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/pieces` | Query: `area`, `type`, `status`, `excludeStatus`（カンマ区切り）, `beforeDate`, `afterDate`, `parentId`（すべて任意） | `{ "pieces": Piece[] }` |
| `POST` | `/api/v1/pieces` | JSON: `Piece` | `201 { "piece": Piece }` |
| `POST` | `/api/v1/pieces/bulk` | JSON: `{ "pieces": Piece[] }`（空配列不可） | `201 { "success": true, "count": number, "data": Piece[] }` |
| `GET` | `/api/v1/pieces/sync` | なし | `{ "lastSyncTime": string \| null }` |
| `POST` | `/api/v1/pieces/sync` | なし | `{ "ok": "SYNC_SUCCESS", ...同期結果 }` |
| `POST` | `/api/v1/pieces/reschedule-overdue` | なし | `{ "pieces": Piece[] }` |
| `GET` | `/api/v1/pieces/:id` | Path: `id` | `{ "piece": Piece }` |
| `GET` | `/api/v1/pieces/:id/blocks` | Path: `id`; Query: `depth`（任意、1〜3、既定 1） | `{ "blocks": object[] }`（`depth >= 2` の場合は子ブロックを `children_blocks` に展開） |
| `POST` | `/api/v1/pieces/:id/blocks` | Path: `id`（Notion 由来 Piece）; JSON: `{ "paragraphs": { "timestamp"?: string, "content": string }[] }` | `201 { "blocks": object[] }`（Notion 本文末尾へ通常段落ブロックを追記） |
| `GET` | `/api/v1/pieces/:id/people` | Path: `id`; Query: `source`（`NOTION` または `LOCAL`、必須） | `{ "people": Person[] }` |
| `POST` | `/api/v1/pieces/:id/promote` | Path: `id`; Body なし | `{ "pieces": Piece[] }`（Notion へ昇格） |
| `PATCH` | `/api/v1/pieces/:id` | Path: `id`; JSON: `Piece` の任意フィールド（`id` を除く） | `{ "piece": Piece }` |
| `DELETE` | `/api/v1/pieces/:id` | Path: `id` | 削除結果オブジェクト |
| `POST` | `/api/v1/pieces/:id/apply-preset` | Path: `id`; JSON: `{ "presetId": string, "baseDate"?: "YYYY-MM-DD", "titlePrefix"?: string }` | `201 { "created_count": number, "created_tasks": Piece[] }` |

`GET /api/v1/pieces/:id` は対象がなければ `404`、`POST /api/v1/pieces` と `PATCH /api/v1/pieces/:id` は入力不正時に `400` を返します。Bulk 作成では `pieces` が未指定・空・配列でない場合 `400` です。

## Task presets（タスクテンプレート）

子タスク要素は `{ "title_suffix": string, "offset_days": integer, "default_status"?: string | null, "sort_order"?: integer }` です。`default_status` は Piece の status 値を指定します。

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/task-presets` | なし | `{ "presets": TaskPreset[] }` |
| `POST` | `/api/v1/task-presets` | JSON: `{ "label": string, "description"?: string \| null, "children"?: Child[] }` | `201 { "preset": TaskPreset }` |
| `GET` | `/api/v1/task-presets/:id` | Path: `id` | `{ "preset": TaskPreset }` |
| `PATCH` | `/api/v1/task-presets/:id` | Path: `id`; JSON: `{ "label"?: string, "description"?: string \| null, "children"?: Child[] }` | `{ "preset": TaskPreset }` |
| `DELETE` | `/api/v1/task-presets/:id` | Path: `id` | `{ "success": true }` |

## People（人物）

`Person` の入力フィールドは `family_name`（必須）、`given_name`、`ruby_family_name`、`ruby_given_name`、`tags`（文字列配列）、`immich_person_id`、`google_contact_id`、`birthday`（`YYYY-MM-DD`）、`blood_type`（文字列配列）、`notes` です。ID は UUID です。

人物と Piece の関連では `notion_piece_id` または `local_piece_id` のどちらか一方を指定します（同時指定・両方省略は不可）。

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/people` | なし | `{ "people": Person[] }` |
| `POST` | `/api/v1/people` | JSON: Person の入力フィールド | `201 { "person": Person }` |
| `GET` | `/api/v1/people/:id` | Path: `id`（UUID） | `{ "person": Person }` |
| `PATCH` | `/api/v1/people/:id` | Path: `id`; JSON: Person の入力フィールドの一部 | `{ "person": Person }` |
| `PATCH` | `/api/v1/people/:id/immich` | Path: `id`（Immich とリンク済みであること） | `{ "success": true, "data": { "personId": string, "name": string, "birthday": string \| null } }` |
| `DELETE` | `/api/v1/people/:id` | Path: `id` | `{ "success": true }` |
| `GET` | `/api/v1/people/:id/pieces` | Path: `id` | `{ "person_pieces": PersonPiece[] }` |
| `POST` | `/api/v1/people/:id/pieces` | Path: `id`; JSON: `{ "notion_piece_id"?: string \| null, "local_piece_id"?: string \| null }`（片方のみ） | `201 { "person_piece": PersonPiece }` |
| `GET` | `/api/v1/people/:id/pieces/:personPieceId` | Path: `id`, `personPieceId`（UUID） | `{ "person_piece": PersonPiece }` |
| `PATCH` | `/api/v1/people/:id/pieces/:personPieceId` | Path: `id`, `personPieceId`; JSON: 関連先 Piece ID（片方のみ） | `{ "person_piece": PersonPiece }` |
| `DELETE` | `/api/v1/people/:id/pieces/:personPieceId` | Path: `id`, `personPieceId` | `{ "success": true }` |

ID 不正は `400`、対象がなければ `404` です。人物の作成・更新時、Immich とリンクされている場合は Immich への同期も行われます。同期に失敗した場合は `502` となり、人物データ自体は保存済みの場合があります。

## Reviews

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/reviews` | Query: `month`（`YYYYMM`） | Monthly / Weekly review の取得・必要に応じた作成結果（オブジェクト） |
| `PATCH` | `/api/v1/reviews/:pageId` | Path: `pageId`; JSON: `{ "propertyName": string, "text"?: string }` | `{ "message": "Review updated successfully" }` |

`month` の形式が不正な場合は `400` です。

## Diaries（日記）

日付は有効な `YYYY-MM-DD` 形式です。`rate` は `1`〜`5` または `null`、`piece_ids` は UUID 配列です。

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/diaries` | Query: `startDate`, `endDate`（任意。両方指定時は開始日 <= 終了日） | `{ "diaries": Diary[] }` |
| `GET` | `/api/v1/diaries/:date` | Path: `date` | `{ "diary": Diary }` |
| `POST` | `/api/v1/diaries` | JSON: `{ "date": string, "rate"?: number \| null, "content"?: string, "flag"?: boolean, "piece_ids"?: string[] }` | `{ "diary": Diary }`（作成または日付をキーに上書き） |
| `PATCH` | `/api/v1/diaries/:date` | Path: `date`; JSON: `{ "rate"?: number \| null, "content"?: string, "flag"?: boolean, "piece_ids"?: string[] }` | `{ "diary": Diary }` |

指定した日記が存在しない場合の `GET` / `PATCH` は `404`、日付・入力が不正な場合は `400` です。

## Sparks

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/sparks` | Query: `targetDate`（任意、`YYYY-MM-DD`） | `{ "data": Spark[] }` |
| `POST` | `/api/v1/sparks` | JSON: `{ "content": string, "recorded_at": ISO datetime, "target_date"?: "YYYY-MM-DD", "discord_message_id"?: string \| null }` | `201 { "data": Spark }`（作成結果がない場合は `200 { "data": null }`） |
| `PATCH` | `/api/v1/sparks/:id/consume` | Path: `id`（UUID） | `{ "data": Spark }` |
| `POST` | `/api/v1/sparks/consume-bulk` | JSON: `{ "ids": string[] }`（UUID を1件以上） | `{ "data": <一括消化結果> }` |
| `DELETE` | `/api/v1/sparks/:id` | Path: `id`（UUID） | `{ "data": { "id": string } }` |

対象が見つからない場合は `404`、ID や入力が不正な場合は `400` です。

## Calendar

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/calendar/events` | なし | `{ "status": "OK", "events": GoogleEvent[] }` |
| `POST` | `/api/v1/calendar/sync` | JSON: `GoogleEvent[]` または `{ "cache_data": GoogleEvent[] }` | `{ "status": "SUCCESS", "count": number }` |

`GoogleEvent` のフィールド: `id`, `title`, `start_date`（`YYYY-MM-DD`）, `start_time`（`HH:mm:ss` または null）, `end_date`, `end_time`, `note`, `url`。不正な形式は `400` です。同期完了時は WebSocket に `REFRESH_CALENDAR` が通知されます。

## AI と Agents

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `POST` | `/api/v1/ai` | JSON: `{ "prompt": string, "agentId"?: string, "is_charged_model"?: boolean }` | 通常 `{ "reply": string }`。Agent が JSON MIME type を指定する場合はパース済み JSON |
| `GET` | `/api/v1/ai/agents` | なし | `{ "success": true, "agents": Agent[] }` |
| `POST` | `/api/v1/ai/agents` | JSON: `{ "id": string, "name": string, "system_prompt"?: string \| null, "temperature"?: number, "response_mime_type"?: string \| null, "sort_order"?: number }` | `201 { "success": true, "data": Agent }` |
| `GET` | `/api/v1/ai/agents/:id` | Path: `id` | `{ "success": true, "data": Agent }` |
| `PATCH` | `/api/v1/ai/agents/:id` | Path: `id`; JSON: Agent の `id` 以外の任意フィールド | `{ "success": true, "data": Agent }` |
| `DELETE` | `/api/v1/ai/agents/:id` | Path: `id` | `{ "success": true, "data": <削除された Agent> }` |

Agent の `temperature` は `0`〜`2` です。`/api/v1/ai` の `prompt` がない場合は `400`、指定した Agent がない場合は `404` です。組み込み Agent ID または DB 登録 Agent ID を `agentId` に指定できます。

## Notes

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/notes` | なし | `{ "notes": Note[] }` |
| `POST` | `/api/v1/notes` | JSON: `{ "title": string, "content"?: string, "url"?: string }` | `201` + 作成された Note |
| `PATCH` | `/api/v1/notes/:id` | Path: `id`; JSON: `title`, `content`, `url`, `is_pinned` のいずれか（少なくとも1フィールド） | 更新された Note |
| `DELETE` | `/api/v1/notes/:id` | Path: `id` | `{ "message": "Note deleted successfully", "id": string }` |

## Routines

Routine の作成フィールド: `title`（必須）、`frequency`（`weekly` / `monthly`）、`type`（`date` / `nthWeekday` / null）、`day`（1〜31）、`week`（1〜5）、`day_of_week`（0〜6）、`note`、`url`、`is_active`。フィールドのうち `type` / `day` / `week` / `day_of_week` は省略可能です。

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/routines` | Query: `frequency`（任意） | `Routine[]` |
| `POST` | `/api/v1/routines` | JSON: Routine 作成フィールド | `201` + 作成された Routine |
| `PATCH` | `/api/v1/routines/:id` | Path: `id`（数値）; JSON: Routine 作成フィールドの一部 | 更新された Routine |
| `DELETE` | `/api/v1/routines/:id` | Path: `id`（数値） | `{ "message": "Routine deleted successfully", "id": number }` |
| `POST` | `/api/v1/routines/generate` | なし | 生成メッセージ、基準日、生成数、生成されたタスクを含むオブジェクト |

作成・更新時の入力不正は `400`、存在しない Routine の更新・削除は `404` です。

## Immich

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/immich/stats` | なし | `{ "success": true, "data": ImmichStats }` |
| `POST` | `/api/v1/immich/sync` | なし | `{ "success": true, "message": string, "data": ImmichStats }` |
| `GET` | `/api/v1/immich/missing-dates` | なし | `{ "success": true, "data": Asset[] }` |
| `POST` | `/api/v1/immich/batch/dates` | JSON: `{ "updates": { "id": string, "dateTimeOriginal": string }[] }` | `{ "success": true, "data": { "success": number, "failed": number, "errors": string[] } }` |
| `POST` | `/api/v1/immich/search` | JSON: `{ "date"?: "YYYY-MM-DD", "personId"?: string }` | `{ "success": true, "data": Asset[] }` |
| `GET` | `/api/v1/immich/people/search` | Query: `name`（必須、完全一致で検索） | `{ "success": true, "data": Person[] }` |
| `GET` | `/api/v1/immich/assets/:id/thumbnail` | Path: `id` | 画像バイナリ（`Content-Type` は上流応答、1日キャッシュ） |

検索 Asset は `id`, `thumbhash`, `originalFileName`, `localDateTime`, `exif`（`make`, `model`, `focalLength` または null）を含みます。`name` 未指定時は `400`、サムネイル取得失敗時は `404` です。

## Paperless-ngx

| Method | Endpoint | 引数 | 成功レスポンス |
|---|---|---|---|
| `GET` | `/api/v1/paperless` | Query: `title`, `document_type`, `correspondent`, `asn`（数値）, `tags`（カンマ区切り、すべて任意） | `{ "documents": Document[] }` |
| `POST` | `/api/v1/paperless/:id/ticket` | Path: `id`（Paperless document ID） | `{ "ticket": string }` |
| `POST` | `/api/v1/paperless/webhook` | JSON: Paperless の webhook payload（`id` 必須） | `{ "message": "Webhook processed successfully" }` |
| `POST` | `/api/v1/paperless/sync` | なし | `{ "message": "Sync completed successfully", "result": <同期結果> }` |
| `POST` | `/api/v1/paperless/upload` | Multipart form: `file`（ファイル必須） | `202 { "message": "Upload started successfully", "task": <task ID> }` |
| `GET` | `/paperless/view` | Query: `ticket`（必須、一回限り、発行後60秒で失効） | PDF バイナリ（`application/pdf`） |

Ticket は `POST /api/v1/paperless/:id/ticket` で発行し、`GET /paperless/view?ticket=...` に渡します。後者は API キー不要ですが、使用済み・期限切れ・無効な ticket は `403`、Paperless 上に文書がなければ `404` です。`file` がない場合は `400` です。

## エラーについて

- API キー未設定または不一致: `401 { "success": false, "error": "Unauthorized" }`
- 入力・形式エラー: 多くのエンドポイントで `400`。エラー本体はコントローラーごとに異なり、`message` / `error` / `errors` / `code` などを含みます。
- 対象なし: 対応するエンドポイントで `404`
- 予期しないサーバーエラー: 一般に `500`。共通エラーハンドラーでは `{ "success": false, "error": "Internal Server Error" }`

## WebSocket 通知

サーバーは同一ポートで WebSocket も受け付け、データ変更に応じて JSON 形式の通知を配信します。代表的な `type` は `REFRESH_PIECES`、`REFRESH_PEOPLE`、`REFRESH_DIARIES`、`REFRESH_NOTES`、`REFRESH_NOTIFICATIONS`、`REFRESH_DOCUMENTS`、`REFRESH_CALENDAR`、`REFRESH_SPARKS` です。

### WebSocket 認証

全ての WebSocket 接続で `ATLAS_API_KEY` による認証が必須です。

- **ヘッダー認証（非ブラウザクライアント向け）**: Upgrade リクエストに `X-API-KEY: <ATLAS_API_KEY>` を付与して接続すると即時認証され、`{ "type": "AUTH_OK" }` が返ります。
- **メッセージ認証（ブラウザ／拡張機能向け）**: 接続後 5 秒以内に `{ "type": "AUTH", "apiKey": "<ATLAS_API_KEY>" }` を送信します。認証成功時に `{ "type": "AUTH_OK" }` が返った後、`REGISTER_DEVICE` や `GET_DEVICES`、`OPEN_URL_ON_PC`（`http://` / `https://` のみ許可）が利用できます。
- 認証失敗時はクローズコード `4003`、タイムアウト時は `4001`、サーバー側キー未設定時は `1008` で切断されます。

---

実装参照: [ルート登録](../atlas-server/src/index.ts)、[models](../atlas-server/src/models/)
