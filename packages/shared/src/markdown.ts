const CHECKLIST_TOGGLE_REGEX =
  /^([ \t]*[-*+][ \t\u3000]+)\[([ xX])\]([ \t\u3000].*)?$/;
const CHECKLIST_BLOCK_REGEX =
  /^([ \t]*)[-*+][ \t\u3000]+\[([ xX])\](?:[ \t\u3000]+(.*))?$/;
const UL_REGEX = /^([ \t]*)[-*+][ \t\u3000]+(.+)$/;
const OL_REGEX = /^([ \t]*)(\d+)[.)][ \t\u3000]+(.+)$/;
const HEADING_REGEX =
  /^[ \t]*(#{1,6})[ \t\u3000]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const BLOCKQUOTE_REGEX = /^[ \t]*>[ \t\u3000]?(.*)$/;
const HR_REGEX = /^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const TABLE_SEP_REGEX =
  /^\|?(?:[ \t]*:?-{3,}:?[ \t]*\|)+[ \t]*:?-{3,}:?[ \t]*\|?$/;

const INLINE_TOKEN_REGEX =
  /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+)/g;

export interface ChecklistStats {
  total: number;
  checked: number;
}

export type MarkdownInlineToken =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'strike'; value: string }
  | { type: 'em'; value: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'autolink'; href: string };

export type MarkdownBlock =
  | { type: 'code'; lineIndex: number; lang: string; code: string }
  | { type: 'table'; lineIndex: number; headers: string[]; rows: string[][] }
  | { type: 'empty'; lineIndex: number }
  | { type: 'hr'; lineIndex: number }
  | { type: 'heading'; lineIndex: number; level: number; text: string }
  | {
      type: 'checklist';
      lineIndex: number;
      indentLevel: number;
      checked: boolean;
      label: string;
    }
  | { type: 'blockquote'; lineIndex: number; lines: string[] }
  | { type: 'ul'; lineIndex: number; indentLevel: number; text: string }
  | {
      type: 'ol';
      lineIndex: number;
      indentLevel: number;
      marker: string;
      text: string;
    }
  | { type: 'paragraph'; lineIndex: number; text: string };

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

  const match = target.match(CHECKLIST_TOGGLE_REGEX);
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
    const match = line.match(CHECKLIST_TOGGLE_REGEX);
    if (!match) continue;
    total += 1;
    if (match[2].toLowerCase() === 'x') checked += 1;
  }

  return total > 0 ? { total, checked } : null;
};

const getIndentLevel = (indent: string): number => {
  const expanded = indent.replace(/\t/g, '  ');
  return Math.min(Math.floor(expanded.length / 2), 4);
};

const splitTableRow = (row: string): string[] =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

/** インライン Markdown 記法（コード・強調・打消し・リンク等）をトークン配列へ分解する */
export const parseMarkdownInline = (text: string): MarkdownInlineToken[] => {
  const tokens: MarkdownInlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(INLINE_TOKEN_REGEX.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const token = match[0];

    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push({ type: 'code', value: token.slice(1, -1) });
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      tokens.push({ type: 'strong', value: token.slice(2, -2) });
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      tokens.push({ type: 'strike', value: token.slice(2, -2) });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push({ type: 'em', value: token.slice(1, -1) });
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        tokens.push({ type: 'link', label: linkMatch[1], href: linkMatch[2] });
      } else {
        tokens.push({ type: 'text', value: token });
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      tokens.push({ type: 'autolink', href: token });
    } else {
      tokens.push({ type: 'text', value: token });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
};

/** Markdown 本文をブロック単位の AST 配列へ解析する */
export const parseMarkdownBlocks = (content: string): MarkdownBlock[] => {
  const lines = normalizeLineEndings(content).split('\n');
  const blocks: MarkdownBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const startIndex = i;
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      blocks.push({
        type: 'code',
        lineIndex: startIndex,
        lang,
        code: codeLines.join('\n'),
      });
      i += 1;
      continue;
    }

    // Markdown table
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      TABLE_SEP_REGEX.test(lines[i + 1].trim())
    ) {
      const startIndex = i;
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      i += 2;
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        lines[i].includes('|')
      ) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', lineIndex: startIndex, headers, rows });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      blocks.push({ type: 'empty', lineIndex: i });
      i += 1;
      continue;
    }

    // Horizontal rule
    if (HR_REGEX.test(line)) {
      blocks.push({ type: 'hr', lineIndex: i });
      i += 1;
      continue;
    }

    // Headings (H1 - H6)
    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        lineIndex: i,
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i += 1;
      continue;
    }

    // Checklist item
    const checklistMatch = line.match(CHECKLIST_BLOCK_REGEX);
    if (checklistMatch) {
      blocks.push({
        type: 'checklist',
        lineIndex: i,
        indentLevel: getIndentLevel(checklistMatch[1]),
        checked: checklistMatch[2].toLowerCase() === 'x',
        label: checklistMatch[3] ?? '',
      });
      i += 1;
      continue;
    }

    // Blockquote (group consecutive lines)
    const quoteMatch = line.match(BLOCKQUOTE_REGEX);
    if (quoteMatch) {
      const startIndex = i;
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(BLOCKQUOTE_REGEX);
        if (!m) break;
        quoteLines.push(m[1]);
        i += 1;
      }
      blocks.push({
        type: 'blockquote',
        lineIndex: startIndex,
        lines: quoteLines,
      });
      continue;
    }

    // Unordered list
    const ulMatch = line.match(UL_REGEX);
    if (ulMatch) {
      blocks.push({
        type: 'ul',
        lineIndex: i,
        indentLevel: getIndentLevel(ulMatch[1]),
        text: ulMatch[2],
      });
      i += 1;
      continue;
    }

    // Ordered list
    const olMatch = line.match(OL_REGEX);
    if (olMatch) {
      blocks.push({
        type: 'ol',
        lineIndex: i,
        indentLevel: getIndentLevel(olMatch[1]),
        marker: olMatch[2],
        text: olMatch[3],
      });
      i += 1;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'paragraph', lineIndex: i, text: line });
    i += 1;
  }

  return blocks;
};
