// atlas-server/src/services/agent.service.ts

import * as agentRepo from '../repositories/agent.repository';
import { CreateAiAgentInput, UpdateAiAgentInput } from '../models/agent.model';

/**
 * すべてのAIエージェントを取得する（sort_order順）
 */
export const getAllAgents = async () => {
  return await agentRepo.getAllAgents();
};

/**
 * IDで特定のAIエージェントを取得する
 */
export const getAgentById = async (id: string) => {
  const agent = await agentRepo.getAgentById(id);
  if (!agent) {
    throw new Error('Agent not found');
  }
  return agent;
};

/**
 * 新しいAIエージェントを作成する
 */
export const createAgent = async (data: CreateAiAgentInput) => {
  // 必要に応じて、ここで data.id をUUIDで生成するなどのロジックを追加
  return await agentRepo.createAgent(data);
};

/**
 * AIエージェントを更新する
 */
export const updateAgent = async (id: string, data: UpdateAiAgentInput) => {
  const updatedAgent = await agentRepo.updateAgent(id, data);
  if (!updatedAgent) {
    throw new Error('Agent not found or update failed');
  }
  return updatedAgent;
};

/**
 * AIエージェントを削除する
 */
export const deleteAgent = async (id: string) => {
  const deletedAgent = await agentRepo.deleteAgent(id);
  if (!deletedAgent) {
    throw new Error('Agent not found or already deleted');
  }
  return deletedAgent;
};
