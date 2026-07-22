import { db } from '../db/client';
import { NewAiAgentRow, AiAgentUpdateRow } from '../models/agent.model';

// すべてのエージェントを取得 (並び順通り)
export const getAllAgents = async () => {
  return await db
    .selectFrom('ai_agents')
    .selectAll()
    .orderBy('sort_order', 'asc')
    .execute();
};

// 特定のエージェントを取得
export const getAgentById = async (id: string) => {
  return await db
    .selectFrom('ai_agents')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
};

// エージェントの作成
export const createAgent = async (data: NewAiAgentRow) => {
  return await db
    .insertInto('ai_agents')
    .values(data)
    .returningAll()
    .executeTakeFirst();
};

// エージェントの更新
export const updateAgent = async (id: string, data: AiAgentUpdateRow) => {
  return await db
    .updateTable('ai_agents')
    .set(data)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
};

// エージェントの削除
export const deleteAgent = async (id: string) => {
  return await db.deleteFrom('ai_agents').where('id', '=', id).execute();
};
