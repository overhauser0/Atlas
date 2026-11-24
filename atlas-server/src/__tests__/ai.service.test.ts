import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { generateContentMock, getGenerativeModelMock, getAgentByIdMock } =
  vi.hoisted(() => {
    const generateContentMock = vi.fn();
    const getGenerativeModelMock = vi.fn(
      (_params: { model: string; systemInstruction: string }) => ({
        generateContent: generateContentMock,
      }),
    );
    const getAgentByIdMock = vi.fn();
    return { generateContentMock, getGenerativeModelMock, getAgentByIdMock };
  });

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: getGenerativeModelMock,
  })),
}));

vi.mock('../services/agent.service', () => ({
  SYSTEM_AGENTS: {
    default: {
      id: 'default',
      name: 'Default',
      system_prompt: 'Default system prompt',
      temperature: 0.7,
      response_mime_type: null,
    },
    'task-parser': {
      id: 'task-parser',
      name: 'Task Parser',
      system_prompt: 'Parse tasks',
      temperature: 0.2,
      response_mime_type: 'application/json',
    },
  },
  getAgentById: getAgentByIdMock,
}));

import { AiServiceError, executeAiTask } from '../services/ai.service';

describe('ai.service executeAiTask', () => {
  const originalGeminiModel = process.env.GEMINI_MODEL;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    process.env.GEMINI_MODEL = originalGeminiModel;
  });

  it('uses GEMINI_MODEL env override and returns text reply for default agent', async () => {
    process.env.GEMINI_MODEL = 'gemini-custom-model';
    generateContentMock.mockResolvedValue({
      response: { text: () => 'Hello from Gemini' },
    });

    const result = await executeAiTask({ prompt: 'Hi' });

    expect(getGenerativeModelMock).toHaveBeenCalledWith({
      model: 'gemini-custom-model',
      systemInstruction: 'Default system prompt',
    });
    expect(result).toEqual({
      isJson: false,
      data: { reply: 'Hello from Gemini' },
    });
  });

  it('injects JST current time and parses JSON for task-parser agent', async () => {
    generateContentMock.mockResolvedValue({
      response: { text: () => '{"tasks":[{"title":"Buy milk"}]}' },
    });

    const result = await executeAiTask({
      prompt: '明日牛乳を買う',
      agentId: 'task-parser',
    });

    const modelArgs = getGenerativeModelMock.mock.calls[0][0];
    expect(modelArgs.systemInstruction).toMatch(/^現在日時: .+\n\nParse tasks$/);
    expect(result).toEqual({
      isJson: true,
      data: { tasks: [{ title: 'Buy milk' }] },
    });
  });

  it('throws 404 AiServiceError when custom agent is not found', async () => {
    getAgentByIdMock.mockResolvedValue(null);

    await expect(
      executeAiTask({ prompt: 'test', agentId: 'missing-agent' }),
    ).rejects.toMatchObject({
      name: 'AiServiceError',
      status: 404,
    });
  });

  it('throws 500 AiServiceError when JSON-mode agent returns invalid JSON', async () => {
    generateContentMock.mockResolvedValue({
      response: { text: () => 'not-valid-json' },
    });

    await expect(
      executeAiTask({ prompt: 'test', agentId: 'task-parser' }),
    ).rejects.toBeInstanceOf(AiServiceError);
  });
});
