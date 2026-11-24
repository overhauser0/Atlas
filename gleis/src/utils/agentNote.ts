const MAX_DEFAULT_TITLE_LENGTH = 40;

export interface AgentNoteContentParams {
  prompt: string;
  response: string;
  agentName: string;
  isCharged: boolean;
}

/**
 * プロンプトの最初の非空行から Note 保存用のデフォルトタイトルを生成する。
 * 先頭の Markdown 記号（見出し・引用・リスト等）と余分な空白を除去し、長すぎる場合は省略する。
 */
export function buildDefaultAgentNoteTitle(
  prompt: string,
  agentName?: string,
): string {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return `${agentName?.trim() || 'Atlas'} Note`;
  }

  const cleaned = firstLine
    .replace(/^(?:[#>*+-]+\s+|\d+\.\s+)/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return `${agentName?.trim() || 'Atlas'} Note`;
  }

  const chars = Array.from(cleaned);
  if (chars.length <= MAX_DEFAULT_TITLE_LENGTH) {
    return cleaned;
  }

  return `${chars.slice(0, MAX_DEFAULT_TITLE_LENGTH).join('').trimEnd()}…`;
}

/**
 * Agent の実行結果（メタ情報・プロンプト・レスポンス）を Note 向けの Markdown 本文に整形する。
 */
export function buildAgentNoteContent({
  prompt,
  response,
  agentName,
  isCharged,
}: AgentNoteContentParams): string {
  const displayAgent = agentName.trim() || 'Atlas';
  const tierLabel = isCharged ? 'Charged' : 'Standard';
  const trimmedPrompt = prompt.trim();
  const trimmedResponse = response.trim();

  return [
    `> **Agent:** ${displayAgent} (${tierLabel})`,
    '',
    '## Prompt',
    '',
    trimmedPrompt,
    '',
    '## Response',
    '',
    trimmedResponse,
  ].join('\n');
}
