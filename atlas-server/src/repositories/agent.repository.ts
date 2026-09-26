// atlas-server/src/repositories/agent.repository.ts

import { db } from '../db/client';
import { NewAiAgentRow, AiAgentUpdateRow } from '../models/agent.model';

/** すべてのエージェントを並び順で取得する。 */
export const getAllAgents = async () => {
  return await db
    .selectFrom('ai_agents')
    .selectAll()
    .orderBy('sort_order', 'asc')
    .execute();
};

/** IDでエージェントを取得する。 */
export const getAgentById = async (id: string) => {
  return await db
    .selectFrom('ai_agents')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
};

/** エージェントを作成する。 */
export const createAgent = async (data: NewAiAgentRow) => {
  return await db
    .insertInto('ai_agents')
    .values(data)
    .returningAll()
    .executeTakeFirst();
};

/** エージェントを更新する。 */
export const updateAgent = async (id: string, data: AiAgentUpdateRow) => {
  return await db
    .updateTable('ai_agents')
    .set(data)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
};

/** エージェントを削除する。 */
export const deleteAgent = async (id: string) => {
  return await db.deleteFrom('ai_agents').where('id', '=', id).execute();
};
