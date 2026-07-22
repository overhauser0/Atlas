// atlas-server/src/controllers/agent.controller.ts

import { Context } from 'hono';
import * as agentService from '../services/agent.service';
import {
  CreateAiAgentSchema,
  UpdateAiAgentSchema,
} from '../models/agent.model';
import { error } from 'console';

/**
 * GET /api/v1/ai/agents
 * 全エージェントの取得
 */
export const getAgents = async (c: Context) => {
  try {
    const agents = await agentService.getAllAgents();
    return c.json({ success: true, data: agents });
  } catch (error: any) {
    console.error('[Agent Controller] getAgents Error:', error);
    return c.json({ success: false, error: 'Failed to fetch agents' }, 500);
  }
};

/**
 * GET /api/v1/ai/agents/:id
 * 特定エージェントの取得
 */
export const getAgent = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) throw error;
    const agent = await agentService.getAgentById(id);

    return c.json({ success: true, data: agent });
  } catch (error: any) {
    if (error.message === 'Agent not found') {
      return c.json({ success: false, error: error.message }, 404);
    }
    console.error('[Agent Controller] getAgent Error:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
};

/**
 * POST /api/v1/ai/agents
 * 新規エージェントの作成
 */
export const createAgent = async (c: Context) => {
  try {
    const body = await c.req.json();

    // Zodによる入力値のバリデーション
    const parsedData = CreateAiAgentSchema.safeParse(body);
    if (!parsedData.success) {
      return c.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsedData.error.errors,
        },
        400,
      );
    }

    const newAgent = await agentService.createAgent(parsedData.data);
    return c.json({ success: true, data: newAgent }, 201);
  } catch (error: any) {
    console.error('[Agent Controller] createAgent Error:', error);
    return c.json({ success: false, error: 'Failed to create agent' }, 500);
  }
};

/**
 * PATCH /api/v1/ai/agents/:id
 * エージェントの部分更新
 */
export const updateAgent = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) throw error;
    const body = await c.req.json();

    // Zodによる入力値のバリデーション
    const parsedData = UpdateAiAgentSchema.safeParse(body);
    if (!parsedData.success) {
      return c.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsedData.error.errors,
        },
        400,
      );
    }

    // 空の更新リクエストを弾く
    if (Object.keys(parsedData.data).length === 0) {
      return c.json({ success: false, error: 'No update data provided' }, 400);
    }

    const updatedAgent = await agentService.updateAgent(id, parsedData.data);
    return c.json({ success: true, data: updatedAgent });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ success: false, error: error.message }, 404);
    }
    console.error('[Agent Controller] updateAgent Error:', error);
    return c.json({ success: false, error: 'Failed to update agent' }, 500);
  }
};

/**
 * DELETE /api/v1/ai/agents/:id
 * エージェントの削除
 */
export const deleteAgent = async (c: Context) => {
  try {
    const id = c.req.param('id');
    if (!id) throw error;
    const deletedAgent = await agentService.deleteAgent(id);

    return c.json({ success: true, data: deletedAgent });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ success: false, error: error.message }, 404);
    }
    console.error('[Agent Controller] deleteAgent Error:', error);
    return c.json({ success: false, error: 'Failed to delete agent' }, 500);
  }
};
