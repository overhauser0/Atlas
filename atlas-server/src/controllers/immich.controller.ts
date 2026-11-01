// src/controllers/immich.controller.ts
import { Context } from 'hono';
import * as immichService from '../services/immich.service';

export const getImmichStats = async (c: Context) => {
  try {
    const stats = await immichService.getImmichStatsFromCache();
    return c.json({ success: true, data: stats }, 200);
  } catch (error: any) {
    console.error('❌ Get Immich Stats Error:', error);
    return c.json(
      {
        success: false,
        message: error.message || 'Failed to fetch Immich stats',
      },
      500,
    );
  }
};

export const syncImmichStats = async (c: Context) => {
  try {
    const updatedStats = await immichService.syncImmichStatsCache();
    return c.json(
      {
        success: true,
        message: 'Immich stats successfully synchronized',
        data: updatedStats,
      },
      200,
    );
  } catch (error: any) {
    console.error('❌ Sync Immich Stats Error:', error);
    return c.json(
      {
        success: false,
        message: error.message || 'Failed to sync Immich stats',
      },
      500,
    );
  }
};

export const getMissingDates = async (c: Context) => {
  try {
    const assets = await immichService.getMissingDateAssets();
    return c.json({ success: true, data: assets }, 200);
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

export const updateMissingDates = async (c: Context) => {
  try {
    const body = await c.req.json();
    if (!body.updates || !Array.isArray(body.updates)) {
      return c.json({ success: false, message: 'Invalid payload' }, 400);
    }

    const result = await immichService.updateAssetsDate(body.updates);
    return c.json({ success: true, data: result }, 200);
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

export const searchAssets = async (c: Context) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const assets = await immichService.searchMyAssets(body);
    return c.json({ success: true, data: assets }, 200);
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
};

export const searchPeopleByFamilyName = async (c: Context) => {
  const familyName = c.req.query('family_name')?.trim();
  if (!familyName) {
    return c.json(
      { success: false, message: 'family_name query parameter is required' },
      400,
    );
  }

  try {
    const people =
      await immichService.searchImmichPeopleByFamilyName(familyName);
    return c.json({ success: true, data: people }, 200);
  } catch (error) {
    console.error('[Immich Controller] People search failed:', error);
    return c.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to search people',
      },
      500,
    );
  }
};

export const getThumbnail = async (c: Context) => {
  const id = c.req.param('id');

  if (!id) {
    return c.text('Asset ID is required', 400);
  }

  try {
    const res = await immichService.getThumbnailProxy(id);
    const contentType = res.headers.get('content-type') || 'image/webp';

    // ブラウザに「1日間（86400秒）キャッシュしてOK」と伝える
    return new Response(res.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    return c.text('Thumbnail not found', 404);
  }
};
