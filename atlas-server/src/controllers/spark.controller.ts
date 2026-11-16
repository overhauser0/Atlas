import { Context } from 'hono';
import {
  ConsumeSparksBulkSchema,
  SparkIdSchema,
  SparkInputSchema,
  SparkTargetDateQuerySchema,
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

  try {
    const data = await sparkService.getSparks(validation.data);
    return c.json({ data }, 200);
  } catch (error) {
    console.error('❌ Get Sparks Error:', error);
    return c.json(
      { data: null, message: 'Failed to retrieve sparks' },
      500,
    );
  }
};

/** Sparkを作成する。 */
export const createSpark = async (c: Context) => {
  try {
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
  } catch (error) {
    console.error('❌ Create Spark Error:', error);
    return c.json({ data: null, message: 'Failed to create spark' }, 500);
  }
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

  try {
    const data = await sparkService.consumeSpark(id);
    if (!data) return c.json({ data: null, message: 'Spark not found' }, 404);
    return c.json({ data }, 200);
  } catch (error) {
    console.error(`❌ Consume Spark Error (${id}):`, error);
    return c.json({ data: null, message: 'Failed to consume spark' }, 500);
  }
};

/** 指定したSparkを一括で消化済みにする。 */
export const consumeSparksBulk = async (c: Context) => {
  try {
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
  } catch (error) {
    console.error('❌ Bulk Consume Sparks Error:', error);
    return c.json({ data: null, message: 'Failed to consume sparks' }, 500);
  }
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

  try {
    const deleted = await sparkService.deleteSpark(id);
    if (!deleted) {
      return c.json({ data: null, message: 'Spark not found' }, 404);
    }
    return c.json({ data: { id } }, 200);
  } catch (error) {
    console.error(`❌ Delete Spark Error (${id}):`, error);
    return c.json({ data: null, message: 'Failed to delete spark' }, 500);
  }
};
