// atlas-server/src/services/ai.service.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as agentService from './agent.service';
import { SYSTEM_AGENTS } from './agent.service';

export class AiServiceError extends Error {
  constructor(
    public readonly status: 400 | 404 | 500,
    message: string,
  ) {
    super(message);
    this.name = 'AiServiceError';
  }
}

export interface ExecuteAiInput {
  prompt: string;
  agentId?: string;
  isChargedModel?: boolean;
}

const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

const getCurrentTimeJST = (now: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatter.format(now);
};

const getGeminiModelName = () =>
  process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

const getGenerativeClient = (isChargedModel: boolean) =>
  new GoogleGenerativeAI(
    isChargedModel
      ? process.env.GEMINI_API_KEY_CHARGED || ''
      : process.env.GEMINI_API_KEY || '',
  );

/** 指定エージェント設定とプロンプトを使って Gemini を実行する。 */
export const executeAiTask = async ({
  prompt,
  agentId,
  isChargedModel = false,
}: ExecuteAiInput): Promise<{ isJson: boolean; data: unknown }> => {
  let systemInstruction = '';
  let temperature = 0.7;
  let responseMimeType: string | null | undefined = undefined;

  if (agentId && SYSTEM_AGENTS[agentId]) {
    const sysAgent = SYSTEM_AGENTS[agentId];
    systemInstruction = sysAgent.system_prompt || '';
    temperature = sysAgent.temperature ?? 0.7;
    responseMimeType = sysAgent.response_mime_type;

    // task-parser は相対日付を解決するため JST 現在日時を先頭へ注入する
    if (agentId === 'task-parser') {
      systemInstruction =
        `現在日時: ${getCurrentTimeJST()}\n\n` + systemInstruction;
    }
  } else if (agentId) {
    const dbAgent = await agentService.getAgentById(agentId);
    if (!dbAgent) {
      throw new AiServiceError(404, 'Agent not found');
    }
    systemInstruction = dbAgent.system_prompt || '';
    temperature = dbAgent.temperature ?? 0.7;
    responseMimeType = dbAgent.response_mime_type;
  } else {
    systemInstruction = SYSTEM_AGENTS.default.system_prompt || '';
    temperature = SYSTEM_AGENTS.default.temperature ?? 0.7;
  }

  const client = getGenerativeClient(isChargedModel);
  const model = client.getGenerativeModel({
    model: getGeminiModelName(),
    systemInstruction,
  });

  const generationConfig: {
    temperature: number;
    responseMimeType?: string;
  } = {
    temperature,
  };
  if (responseMimeType) {
    generationConfig.responseMimeType = responseMimeType;
  }

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  });

  const aiResponseText = result.response.text();

  if (responseMimeType === 'application/json') {
    try {
      return { isJson: true, data: JSON.parse(aiResponseText) };
    } catch {
      console.error(
        'Failed to parse JSON response from Gemini:',
        aiResponseText,
      );
      throw new AiServiceError(500, 'Failed to parse JSON response from AI');
    }
  }

  return { isJson: false, data: { reply: aiResponseText } };
};
