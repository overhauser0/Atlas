import { Context } from 'hono';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Geminiクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const brainstorm = async (c: Context) => {
  try {
    const { message, context } = await c.req.json();

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // システムプロンプト
    const systemInstruction = `
      あなたは私の仕事（塾講師・エンジニア）をサポートする優秀なアシスタント「Atlas」です。
      以下のルールに従って回答してください：
      1. 簡潔かつ論理的に答えること（無駄な前置きは不要）。
      2. アイデア出しを求められた場合は、実用的な案を箇条書きで出すこと。
      3. マークダウン形式を利用して読みやすくすること。
      ${context ? `現在のコンテキスト: ${context}` : ''}
    `;

    // モデルの初期化
    // ※ 2026年時点の最新安定版に合わせて調整してください
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: systemInstruction,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.7,
      },
    });

    const response = result.response;
    return c.json({ reply: response.text() });
  } catch (error) {
    console.error('AI Brainstorm Error:', error);
    return c.json({ error: 'Failed to brainstorm with AI' }, 500);
  }
};
