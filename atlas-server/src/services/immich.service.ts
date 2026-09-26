// atlas-server/src/services/immich.service.ts

import * as immichRepository from '../repositories/immich.repository';

const IMMICH_API_URL =
  process.env.IMMICH_API_URL || 'http://192.168.13.55:2283/api';
const IMMICH_API_KEY = process.env.IMMICH_API_KEY || '';

type Separator = 'slash' | 'hyphen' | 'none';

const getDateFullString = (
  date: Date | string | null | undefined,
  separator: Separator = 'slash',
): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) {
      return '';
    }

    const baseDateString = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tokyo',
    }).format(d);

    switch (separator) {
      case 'hyphen':
        return baseDateString.replace(/\//g, '-');
      case 'none':
        return baseDateString.replace(/\//g, '');
      case 'slash':
      default:
        return baseDateString;
    }
  } catch (error) {
    return '';
  }
};

/** Immich APIから現在ユーザーを取得する。 */
async function getMyUserId() {
  const meRes = await fetch(`${IMMICH_API_URL}/users/me`, {
    headers: { 'x-api-key': IMMICH_API_KEY, Accept: 'application/json' },
  });
  if (!meRes.ok) throw new Error('Failed to fetch user');
  return (await meRes.json()) as any;
}

/** Immichから統計を取得し、キャッシュを更新する。 */
export async function syncImmichStatsCache() {
  try {
    // 1. 自分のユーザー情報を取得
    const me = await getMyUserId();
    const myUserId = me.id;

    // 2. 基本統計の取得 (/server/statistics)
    const statsRes = await fetch(`${IMMICH_API_URL}/server/statistics`, {
      method: 'GET',
      headers: { 'x-api-key': IMMICH_API_KEY, Accept: 'application/json' },
    });
    if (!statsRes.ok) throw new Error('Failed to fetch Immich statistics');
    const rawStats = (await statsRes.json()) as any;

    // 自分のユーザーの統計データ（usageByUser から抽出）
    const myUserStats = rawStats.usageByUser?.find(
      (u: any) => u.userId === myUserId,
    ) || {
      photos: rawStats.photos || 0,
      videos: rawStats.videos || 0,
      usage: rawStats.usage || 0,
    };

    // 3. 自分自身のアセットだけをページネーション取得 (ownerId を指定)
    const makeCounts: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};
    const lensCounts: Record<string, number> = {};
    const focalLengthCounts: Record<string, number> = {};
    const stateCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};

    let page = 1;
    const pageSize = 1000;
    const maxPages = 50;

    while (page <= maxPages) {
      const searchRes = await fetch(`${IMMICH_API_URL}/search/metadata`, {
        method: 'POST',
        headers: {
          'x-api-key': IMMICH_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          withExif: true,
          page: page,
          size: pageSize,
        }),
      });

      if (!searchRes.ok) break;

      const json = (await searchRes.json()) as any;
      let items: any[] = [];
      if (Array.isArray(json)) {
        items = json;
      } else if (json?.assets?.items) {
        items = json.assets.items;
      } else if (json?.items) {
        items = json.items;
      }

      if (items.length === 0) break;

      // EXIF & 撮影日解析
      for (const asset of items) {
        // --- 撮影日 (草用) ---
        const dateStr =
          asset.exifInfo?.dateTimeOriginal ||
          asset.fileCreatedAt ||
          asset.localDateTime;
        if (dateStr) {
          const formattedDate = getDateFullString(dateStr, 'hyphen');
          dailyCounts[formattedDate] = (dailyCounts[formattedDate] || 0) + 1;
        }

        const exif = asset.exifInfo;
        if (!exif) continue;

        // --- Make (メーカー) ---
        if (exif.make) {
          const makeName = exif.make.trim();
          makeCounts[makeName] = (makeCounts[makeName] || 0) + 1;
        }

        // --- Model (機種名) ---
        if (exif.model) {
          const modelName = exif.model.trim();
          modelCounts[modelName] = (modelCounts[modelName] || 0) + 1;
        }

        // --- Lens ---
        if (exif.lensModel) {
          lensCounts[exif.lensModel] = (lensCounts[exif.lensModel] || 0) + 1;
        }

        // --- Focal Length ---
        if (exif.focalLength) {
          const fl = `${Math.round(Number(exif.focalLength))}mm`;
          focalLengthCounts[fl] = (focalLengthCounts[fl] || 0) + 1;
        }

        // --- State (都道府県・州) ---
        if (exif.state) {
          const stateName = exif.state.trim();
          stateCounts[stateName] = (stateCounts[stateName] || 0) + 1;
        }
      }

      if (items.length < pageSize) break;
      page++;
    }

    const formatTop10 = (obj: Record<string, number>) => {
      return Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
    };

    const formattedData = {
      total: (myUserStats.photos || 0) + (myUserStats.videos || 0),
      images: myUserStats.photos || 0,
      videos: myUserStats.videos || 0,
      storage: {
        usedBytes:
          myUserStats.usagePhotos + myUserStats.usageVideos ||
          myUserStats.usage ||
          0,
        usedGb: Number(
          (
            (myUserStats.usagePhotos + myUserStats.usageVideos ||
              myUserStats.usage ||
              0) /
            (1024 * 1024 * 1024)
          ).toFixed(1),
        ),
      },
      topMakes: formatTop10(makeCounts),
      topModels: formatTop10(modelCounts),
      topLenses: formatTop10(lensCounts),
      topFocalLengths: formatTop10(focalLengthCounts),
      topStates: formatTop10(stateCounts),
      dailyCounts,
      syncedAt: new Date().toISOString(),
    };

    await immichRepository.upsertImmichCacheToDb('stats', formattedData);
    return formattedData;
  } catch (error: any) {
    console.error('❌ Sync Immich Stats Error:', error.message);
    throw new Error('Failed to communicate with Immich API');
  }
}

/** キャッシュ済みのImmich統計を取得する。 */
export async function getImmichStatsFromCache() {
  const cached = await immichRepository.getImmichCacheFromDb('stats');

  if (!cached) {
    return await syncImmichStatsCache();
  }

  return typeof cached.data === 'string'
    ? JSON.parse(cached.data)
    : cached.data;
}

/** 撮影日時が欠損しているアセットを取得する。 */
export async function getMissingDateAssets() {
  const meRes = await fetch(`${IMMICH_API_URL}/users/me`, {
    method: 'GET',
    headers: { 'x-api-key': IMMICH_API_KEY, Accept: 'application/json' },
  });
  if (!meRes.ok) throw new Error('Failed to fetch user');
  const me = (await meRes.json()) as any;
  const myUserId = me.id;

  let page = 1;
  const pageSize = 1000;
  const maxPages = 20; // 検索範囲
  const missingAssets: any[] = [];

  while (page <= maxPages) {
    const searchRes = await fetch(`${IMMICH_API_URL}/search/metadata`, {
      method: 'POST',
      headers: {
        'x-api-key': IMMICH_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        withExif: true,
        ownerId: myUserId,
        page: page,
        size: pageSize,
      }),
    });

    if (!searchRes.ok) break;
    const json = (await searchRes.json()) as any;

    let items: any[] = [];
    if (Array.isArray(json)) items = json;
    else if (json?.assets?.items) items = json.assets.items;
    else if (json?.items) items = json.items;

    if (items.length === 0) break;

    for (const asset of items) {
      if (asset.ownerId !== myUserId) continue;

      // 日付が欠損しているかどうかの判定（今回は dateTimeOriginal が無いもの）
      if (!asset.exifInfo?.dateTimeOriginal) {
        missingAssets.push({
          id: asset.id,
          originalFileName: asset.originalFileName,
          fileCreatedAt: asset.fileCreatedAt,
          thumbhash: asset.thumbhash, // UI表示用
        });
      }
    }

    if (items.length < pageSize) break;
    page++;
  }

  return missingAssets;
}

/** 複数アセットの撮影日時を一括更新する。 */
export async function updateAssetsDate(
  updates: { id: string; dateTimeOriginal: string }[],
) {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  // Immich の PUT /assets/{id} を各アセットに対して実行
  // ※負荷を考慮し、少数の場合は Promise.all、多数の場合はチャンク処理が推奨
  await Promise.all(
    updates.map(async (update) => {
      try {
        const res = await fetch(`${IMMICH_API_URL}/assets/${update.id}`, {
          method: 'PUT',
          headers: {
            'x-api-key': IMMICH_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            dateTimeOriginal: update.dateTimeOriginal,
          }),
        });

        if (res.ok) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Failed to update ${update.id}`);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Error updating ${update.id}: ${err.message}`);
      }
    }),
  );

  return results;
}

/** 条件に一致する自分のアセットを検索する。 */
export async function searchMyAssets(filters: { date?: string }) {
  const me = await getMyUserId();
  const myUserId = me.id;

  const reqBody: any = {
    withExif: true,
    size: 1000, // 1日の撮影枚数上限目安
  };

  // 日付フィルターが指定された場合（takenAfter / takenBefore）
  if (filters.date) {
    // タイムゾーン(JST)を考慮して一日の開始・終了を生成
    const startDate = new Date(`${filters.date}T00:00:00+09:00`);
    const endDate = new Date(`${filters.date}T23:59:59+09:00`);
    reqBody.takenAfter = startDate.toISOString();
    reqBody.takenBefore = endDate.toISOString();
  }

  const res = await fetch(`${IMMICH_API_URL}/search/metadata`, {
    method: 'POST',
    headers: {
      'x-api-key': IMMICH_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) throw new Error('Search failed');
  const json = (await res.json()) as any;

  let items: any[] = [];
  if (Array.isArray(json)) items = json;
  else if (json?.assets?.items) items = json.assets.items;
  else if (json?.items) items = json.items;

  // 自分のアセットのみにフィルタリングして必要なプロパティだけ整形して返す
  return items
    .filter((asset) => asset.ownerId === myUserId)
    .map((asset) => ({
      id: asset.id,
      thumbhash: asset.thumbhash,
      originalFileName: asset.originalFileName,
      localDateTime: asset.localDateTime,
      exif: asset.exifInfo
        ? {
            make: asset.exifInfo.make,
            model: asset.exifInfo.model,
            focalLength: asset.exifInfo.focalLength,
          }
        : null,
    }));
}

/** Immichからサムネイルを取得する。 */
export async function getThumbnailProxy(id: string) {
  return fetch(`${IMMICH_API_URL}/assets/${id}/thumbnail?size=thumbnail`, {
    method: 'GET',
    headers: { 'x-api-key': IMMICH_API_KEY },
  });
}
