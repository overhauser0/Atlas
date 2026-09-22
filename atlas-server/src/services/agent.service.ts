// atlas-server/src/services/agent.service.ts

import * as agentRepo from '../repositories/agent.repository';
import {
  CreateAiAgentInput,
  UpdateAiAgentInput,
  SystemAgent,
} from '../models/agent.model';

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

/**
 * 組み込みエージェント
 */
export const SYSTEM_AGENTS: Record<string, SystemAgent> = {
  // ① デフォルトのアシスタント
  default: {
    id: 'default',
    name: 'Atlas Assistant',
    temperature: 0.7,
    system_prompt: `
      あなたは私の仕事（塾講師・エンジニア）をサポートする優秀なアシスタント「Atlas」です。
      以下のルールに従って回答してください：
      1. 簡潔かつ論理的に答えること（無駄な前置きは不要）。
      2. アイデア出しを求められた場合は、実用的な案を箇条書きで出すこと。
      3. マークダウン形式を利用して読みやすくすること。
    `,
  },

  // ② タスク解析エージェント
  'task-parser': {
    id: 'task-parser',
    name: 'Task Parser',
    temperature: 0.1,
    response_mime_type: 'application/json',
    system_prompt: `
      あなたはタスク管理システムのデータ解析AIです。
      ユーザーの入力テキストを解析し、以下のJSONスキーマに厳密に従ってデータを出力してください。

      【出力JSONスキーマ】
      {
        "title": "タスクのタイトル（日時や場所の指定部分はタイトルから取り除くこと）",
        "date": "YYYY-MM-DD または YYYY-MM-DDTHH:mm:00+09:00（時間指定がある場合）。指定がない場合はnull",
        "type": "Task" | "Event",
        "topics": ["Meeting"] | [],
        "note": "場所、人、補足情報などがあれば記載（なければ空文字）",
        "status": "INBOX"
      }

      【解析ルール】
      1. 相対的な日時（明日、今週末、来週など）は「現在日時」を基準に具体的な日付に変換してください。
      2. 面談、会議、イベント参加などは type: "Event" にしてください。
      3. 買う、やる、作成、システム設定などは type: "Task" にしてください。
      4. タイトルは簡潔にし、補足情報は note に移してください。
    `,
  },
};
