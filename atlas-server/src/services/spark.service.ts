import type {
  ConsumeSparksBulkInput,
  SparkInput,
  SparkTargetDateQuery,
} from '../models/spark.model';
import * as sparkRepository from '../repositories/spark.repository';
import { broadcast } from '../utils/websocket';

const getSparksSyncWebhookUrl = () => {
  const url = process.env.N8N_SPARKS_SYNC_URL?.trim();
  if (!url) {
    throw new Error('N8N_SPARKS_SYNC_URL is not configured');
  }
  return url;
};

export const getTargetDateFromRecordedAt = (recordedAt: Date | string) => {
  const date = recordedAt instanceof Date ? recordedAt : new Date(recordedAt);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = Number(getPart('year'));
  const month = Number(getPart('month'));
  const day = Number(getPart('day'));
  const hour = Number(getPart('hour'));

  const targetDate = new Date(Date.UTC(year, month - 1, day));
  if (hour < 4) targetDate.setUTCDate(targetDate.getUTCDate() - 1);
  return targetDate.toISOString().slice(0, 10);
};

/** 未消化のSparkを対象日で絞り込んで取得する。 */
export const getSparks = async ({ targetDate }: SparkTargetDateQuery) => {
  return await sparkRepository.getSparks(targetDate);
};

/** target_dateを補完してSparkを作成する。 */
export const createSpark = async (spark: SparkInput) => {
  const targetDate =
    spark.target_date ?? getTargetDateFromRecordedAt(spark.recorded_at);

  return await sparkRepository.createSpark({
    ...spark,
    discord_message_id: spark.discord_message_id ?? null,
    target_date: targetDate,
  });
};

/** Sparkを消化済みにする。 */
export const consumeSpark = async (id: string) => {
  const consumed = await sparkRepository.consumeSpark(id, new Date());
  if (consumed) {
    broadcast(JSON.stringify({ type: 'REFRESH_SPARKS' }));
  }
  return consumed;
};

/** 指定されたSparkを一括で消化済みにする。 */
export const consumeSparksBulk = async ({
  ids,
}: ConsumeSparksBulkInput) => {
  const consumed = await sparkRepository.consumeSparksBulk(ids, new Date());
  if (consumed.length > 0) {
    broadcast(JSON.stringify({ type: 'REFRESH_SPARKS' }));
  }
  return consumed;
};

/** Sparkを物理削除する。 */
export const deleteSpark = async (id: string) => {
  return await sparkRepository.deleteSpark(id);
};

/** n8n Webhookを実行してDiscordからSparksを同期し、完了後にWSで通知する。 */
export const syncSparks = async () => {
  const response = await fetch(getSparksSyncWebhookUrl(), {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(
      `Sparks sync webhook failed with status ${response.status}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  let webhookResponse: unknown = null;
  if (contentType.includes('application/json')) {
    webhookResponse = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    webhookResponse = text || null;
  }

  broadcast(JSON.stringify({ type: 'REFRESH_SPARKS' }));

  return {
    syncedAt: new Date().toISOString(),
    webhookResponse,
  };
};
