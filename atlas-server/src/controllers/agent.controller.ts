// atlas-server/src/controllers/agent.controller.ts

import { Context } from 'hono';
import * as agentService from '../services/agent.service';
import {
  CreateAiAgentSchema,
  UpdateAiAgentSchema,
} from '../models/agent.model';

/**
 * GET /api/v1/ai/agents
 * 全エージェントの取得
 */
export const getAgents = async (c: Context) => {
  const agents = await agentService.getAllAgents();
  return c.json({ success: true, agents });
};

/**
 * GET /api/v1/ai/agents/:id
 * 特定エージェントの取得
 */
export const getAgent = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ success: false, error: 'Agent ID is required' }, 400);
  }

  try {
    const agent = await agentService.getAgentById(id);
    return c.json({ success: true, data: agent });
  } catch (error) {
    if (error instanceof Error && error.message === 'Agent not found') {
      return c.json({ success: false, error: error.message }, 404);
    }
    throw error;
  }
};

/**
 * POST /api/v1/ai/agents
 * 新規エージェントの作成
 */
export const createAgent = async (c: Context) => {
  const body = await c.req.json();

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
};

/**
 * PATCH /api/v1/ai/agents/:id
 * エージェントの部分更新
 */
export const updateAgent = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ success: false, error: 'Agent ID is required' }, 400);
  }

  const body = await c.req.json();

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

  if (Object.keys(parsedData.data).length === 0) {
    return c.json({ success: false, error: 'No update data provided' }, 400);
  }

  try {
    const updatedAgent = await agentService.updateAgent(id, parsedData.data);
    return c.json({ success: true, data: updatedAgent });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ success: false, error: error.message }, 404);
    }
    throw error;
  }
};

/**
 * DELETE /api/v1/ai/agents/:id
 * エージェントの削除
 */
export const deleteAgent = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ success: false, error: 'Agent ID is required' }, 400);
  }

  try {
    const deletedAgent = await agentService.deleteAgent(id);
    return c.json({ success: true, data: deletedAgent });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ success: false, error: error.message }, 404);
    }
    throw error;
  }
};
