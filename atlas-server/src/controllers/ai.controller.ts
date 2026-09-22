import { Context } from 'hono';
import * as agentService from '../services/agent.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_AGENTS } from '../services/agent.service';

// Geminiクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const genAI_charged = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY_CHARGED || '',
);

/**
 * JSTの現在日時文字列を生成するヘルパー関数
 */
const getCurrentTimeJST = () => {
  const now = new Date();
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

// ==========================================
// エージェント実行・タスク解析共通
// ==========================================
export const execute = async (c: Context) => {
  try {
    const { prompt, agentId, is_charged_model = false } = await c.req.json();

    if (!prompt) {
      return c.json({ error: 'Prompt is required' }, 400);
    }

    let systemInstruction = '';
    let temperature = 0.7; // デフォルト値
    let responseMimeType: string | null | undefined = undefined;

    // 1. システム組み込みエージェントのチェック (task-parser, default等)
    if (agentId && SYSTEM_AGENTS[agentId]) {
      const sysAgent = SYSTEM_AGENTS[agentId];
      systemInstruction = sysAgent.system_prompt || '';
      temperature = sysAgent.temperature ?? 0.7;
      responseMimeType = sysAgent.response_mime_type;

      // task-parserの場合は現在日時をプロンプトの先頭に動的注入
      if (agentId === 'task-parser') {
        systemInstruction =
          `現在日時: ${getCurrentTimeJST()}\n\n` + systemInstruction;
      }
    }
    // 2. ユーザーが登録したDB上のカスタムエージェントのチェック
    else if (agentId) {
      const dbAgent = await agentService.getAgentById(agentId);
      if (!dbAgent) {
        return c.json({ error: 'Agent not found' }, 404);
      }
      systemInstruction = dbAgent.system_prompt || '';
      temperature = dbAgent.temperature ?? 0.7;
      responseMimeType = dbAgent.response_mime_type;
    }
    // 3. agentId 未指定時のデフォルト動作
    else {
      systemInstruction = SYSTEM_AGENTS.default.system_prompt || '';
      temperature = SYSTEM_AGENTS.default.temperature ?? 0.7;
    }

    // AIクライアントの選択
    const useAI = is_charged_model ? genAI_charged : genAI;

    // モデルの初期化
    const model = useAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: systemInstruction,
    });

    // 実行設定
    const generationConfig: any = {
      temperature,
    };
    if (responseMimeType) {
      generationConfig.responseMimeType = responseMimeType;
    }

    // AIの呼び出し
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const aiResponseText = result.response.text();

    // レスポンスフォーマットが JSON 指定の場合はパースして返す
    if (responseMimeType === 'application/json') {
      try {
        const parsedData = JSON.parse(aiResponseText);
        return c.json(parsedData);
      } catch (e) {
        console.error(
          'Failed to parse JSON response from Gemini:',
          aiResponseText,
        );
        return c.json({ error: 'Failed to parse JSON response from AI' }, 500);
      }
    }

    // 通常のテキストレスポンス
    return c.json({ reply: aiResponseText });
  } catch (error) {
    console.error('AI Execute Error:', error);
    return c.json({ error: 'Failed to execute AI task' }, 500);
  }
};
