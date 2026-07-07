import { Context } from 'hono';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Geminiクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ==========================================
// 1. Brainstorm (AIへの質問・アイデア出し)
// ==========================================

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

// ==========================================
// 2. Parse Task (自然言語からタスク生成)
// ==========================================
export const parseTask = async (c: Context) => {
  try {
    const { text } = await c.req.json();

    if (!text) {
      return c.json({ error: 'Text is required' }, 400);
    }

    // サーバーの現在日時を取得してJSTにフォーマット
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
    const currentTimeJST = formatter.format(now); // 例: "2026/07/07(火) 18:30"

    const systemInstruction = `
      あなたはタスク管理システムのデータ解析AIです。
      ユーザーの入力テキストを解析し、以下のJSONスキーマに厳密に従ってデータを出力してください。
      
      現在日時: ${currentTimeJST}

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
      2. 面談、会議、イベント参加（例: リアル脱出ゲーム、ゴルフ、飲み会）などは type: "Event" にしてください。
      3. 買う、やる、作成、システム設定（例: Dockerの更新、Gleisの実装）などは type: "Task" にしてください。
      4. タイトルは簡潔にし、補足情報は note に移してください。

      【例1】
      入力: 「明日の15時に新規面談」
      出力:
      {
        "title": "新規面談",
        "date": "2026-07-08T15:00:00+09:00",
        "type": "Event",
        "topics": ["Meeting"],
        "note": "",
        "status": "INBOX"
      }

      【例2】
      入力: 「今週末に笠岡でゴルフ」
      出力:
      {
        "title": "ゴルフ",
        "date": "2026-07-11",
        "type": "Event",
        "topics": [],
        "note": "笠岡",
        "status": "INBOX"
      }

      【例3】
      入力: 「SAKURAO蒸留所の予約をする」
      出力:
      {
        "title": "SAKURAO蒸留所の予約",
        "date": null,
        "type": "Task",
        "topics": [],
        "note": "",
        "status": "INBOX"
      }
    `;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: systemInstruction,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        temperature: 0.1, // 解析タスクのため、揺らぎを最小限にする
        responseMimeType: 'application/json',
      },
    });

    const aiResponseText = result.response.text();
    const parsedData = JSON.parse(aiResponseText);

    return c.json(parsedData);
  } catch (error) {
    console.error('AI Parse Task Error:', error);
    // 失敗時はフロントエンドのフォールバック処理に任せる
    return c.json({ error: 'Failed to parse task' }, 500);
  }
};
