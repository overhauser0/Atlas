// atlas-server/src/controllers/spark.controller.ts

import { Context } from 'hono';
import {
  ConsumeSparksBulkSchema,
  SparkIdSchema,
  SparkInputSchema,
  SparkTargetDateQuerySchema,
  UpdateSparkSchema,
} from '../models/spark.model';
import * as sparkService from '../services/spark.service';

/** 未消化のSpark一覧を取得する。 */
export const getSparks = async (c: Context) => {
  const validation = SparkTargetDateQuerySchema.safeParse({
    targetDate: c.req.query('targetDate'),
  });
  if (!validation.success) {
    return c.json(
      {
        data: null,
        message: 'Invalid query parameters',
        errors: validation.error.format(),
      },
      400,
    );
  }

  const data = await sparkService.getSparks(validation.data);
  return c.json({ data }, 200);
};

/** Sparkを作成する。 */
export const createSpark = async (c: Context) => {
  const validation = SparkInputSchema.safeParse(await c.req.json());
  if (!validation.success) {
    return c.json(
      {
        data: null,
        message: 'Invalid input data',
        errors: validation.error.format(),
      },
      400,
    );
  }

  const data = await sparkService.createSpark(validation.data);
  return c.json({ data: data ?? null }, data ? 201 : 200);
};

/** Sparkの内容・日時を更新する。 */
export const updateSpark = async (c: Context) => {
  const idValidation = SparkIdSchema.safeParse(c.req.param('id'));
  if (!idValidation.success) {
    return c.json(
      {
        data: null,
        message: 'Invalid spark ID',
        errors: idValidation.error.format(),
      },
      400,
    );
  }

  const bodyValidation = UpdateSparkSchema.safeParse(await c.req.json());
  if (!bodyValidation.success || Object.keys(bodyValidation.data).length === 0) {
    return c.json(
      {
        data: null,
        message: 'Invalid input data',
        errors: bodyValidation.success ? undefined : bodyValidation.error.format(),
      },
      400,
    );
  }

  const data = await sparkService.updateSpark(
    idValidation.data,
    bodyValidation.data,
  );
  if (!data) return c.json({ data: null, message: 'Spark not found' }, 404);
  return c.json({ data }, 200);
};

/** Sparkを消化済みにする。 */
export const consumeSpark = async (c: Context) => {
  const idValidation = SparkIdSchema.safeParse(c.req.param('id'));
  if (!idValidation.success) {
    return c.json(
      {
        data: null,
        message: 'Invalid spark ID',
        errors: idValidation.error.format(),
      },
      400,
    );
  }
  const id = idValidation.data;

  const data = await sparkService.consumeSpark(id);
  if (!data) return c.json({ data: null, message: 'Spark not found' }, 404);
  return c.json({ data }, 200);
};

/** 指定したSparkを一括で消化済みにする。 */
export const consumeSparksBulk = async (c: Context) => {
  const validation = ConsumeSparksBulkSchema.safeParse(await c.req.json());
  if (!validation.success) {
    return c.json(
      {
        data: null,
        message: 'Invalid input data',
        errors: validation.error.format(),
      },
      400,
    );
  }

  const data = await sparkService.consumeSparksBulk(validation.data);
  return c.json({ data }, 200);
};

/** Sparkを物理削除する。 */
export const deleteSpark = async (c: Context) => {
  const idValidation = SparkIdSchema.safeParse(c.req.param('id'));
  if (!idValidation.success) {
    return c.json(
      {
        data: null,
        message: 'Invalid spark ID',
        errors: idValidation.error.format(),
      },
      400,
    );
  }
  const id = idValidation.data;

  const deleted = await sparkService.deleteSpark(id);
  if (!deleted) {
    return c.json({ data: null, message: 'Spark not found' }, 404);
  }
  return c.json({ data: { id } }, 200);
};

/** DiscordからSparksを即時同期する。 */
export const syncSparks = async (c: Context) => {
  const data = await sparkService.syncSparks();
  return c.json({ data }, 200);
};
