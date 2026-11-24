// atlas-server/src/controllers/immich.controller.ts

import { Context } from 'hono';
import * as immichService from '../services/immich.service';

export const getImmichStats = async (c: Context) => {
  const stats = await immichService.getImmichStatsFromCache();
  return c.json({ success: true, data: stats }, 200);
};

export const syncImmichStats = async (c: Context) => {
  const updatedStats = await immichService.syncImmichStatsCache();
  return c.json(
    {
      success: true,
      message: 'Immich stats successfully synchronized',
      data: updatedStats,
    },
    200,
  );
};

export const getMissingDates = async (c: Context) => {
  const assets = await immichService.getMissingDateAssets();
  return c.json({ success: true, data: assets }, 200);
};

export const updateMissingDates = async (c: Context) => {
  const body = await c.req.json();
  if (!body.updates || !Array.isArray(body.updates)) {
    return c.json({ success: false, message: 'Invalid payload' }, 400);
  }

  const result = await immichService.updateAssetsDate(body.updates);
  return c.json({ success: true, data: result }, 200);
};

export const searchAssets = async (c: Context) => {
  const body = await c.req.json().catch(() => ({}));
  const assets = await immichService.searchMyAssets(body);
  return c.json({ success: true, data: assets }, 200);
};

export const searchPeopleByName = async (c: Context) => {
  const name = c.req.query('name')?.trim();
  if (!name) {
    return c.json(
      { success: false, message: 'name query parameter is required' },
      400,
    );
  }

  const people = await immichService.searchImmichPeopleByName(name);
  return c.json({ success: true, data: people }, 200);
};

export const getThumbnail = async (c: Context) => {
  const id = c.req.param('id');

  if (!id) {
    return c.text('Asset ID is required', 400);
  }

  try {
    const res = await immichService.getThumbnailProxy(id);
    if (!res.ok) {
      return c.text('Thumbnail not found', 404);
    }
    const contentType = res.headers.get('content-type') || 'image/webp';

    // ブラウザに「1日間（86400秒）キャッシュしてOK」と伝える
    return new Response(res.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    });
  } catch {
    return c.text('Thumbnail not found', 404);
  }
};
