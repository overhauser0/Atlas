// atlas-server/src/controllers/ai.controller.ts

import { Context } from 'hono';
import * as aiService from '../services/ai.service';

export const execute = async (c: Context) => {
  const { prompt, agentId, is_charged_model = false } = await c.req.json();

  if (!prompt || typeof prompt !== 'string') {
    return c.json({ error: 'Prompt is required' }, 400);
  }

  try {
    const result = await aiService.executeAiTask({
      prompt,
      agentId: typeof agentId === 'string' ? agentId : undefined,
      isChargedModel: Boolean(is_charged_model),
    });
    return c.json(result.data);
  } catch (error) {
    if (error instanceof aiService.AiServiceError && error.status < 500) {
      return c.json({ error: error.message }, error.status);
    }
    throw error;
  }
};
