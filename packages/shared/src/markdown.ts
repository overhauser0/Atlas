const CHECKLIST_REGEX = /^([ \t]*[-*+][ \t\u3000]+)\[([ xX])\]([ \t\u3000].*)?$/;

export interface ChecklistStats {
  total: number;
  checked: number;
}

/** 改行コードを LF (\n) に正規化する */
export const normalizeLineEndings = (text: string): string =>
  text.replace(/\r\n?/g, '\n');

/** 指定行の Markdown チェックボックス (- [ ] / - [x]) をトグルする */
export const toggleChecklistLine = (
  markdown: string,
  lineIndex: number,
): string => {
  const lines = normalizeLineEndings(markdown).split('\n');
  const target = lines[lineIndex];
  if (target === undefined) return markdown;

  const match = target.match(CHECKLIST_REGEX);
  if (!match) return markdown;

  const [, prefix, state, rest = ''] = match;
  const nextState = state.toLowerCase() === 'x' ? ' ' : 'x';
  lines[lineIndex] = `${prefix}[${nextState}]${rest}`;
  return lines.join('\n');
};

/** Markdown 内のチェックリスト件数と完了数を集計する */
export const getChecklistStats = (markdown: string): ChecklistStats | null => {
  if (!markdown) return null;
  let total = 0;
  let checked = 0;

  for (const line of normalizeLineEndings(markdown).split('\n')) {
    const match = line.match(CHECKLIST_REGEX);
    if (!match) continue;
    total += 1;
    if (match[2].toLowerCase() === 'x') checked += 1;
  }

  return total > 0 ? { total, checked } : null;
};
