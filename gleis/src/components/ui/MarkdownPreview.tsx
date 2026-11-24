'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { triggerHaptics } from '@/lib/haptics';
import { normalizeLineEndings } from '@atlas/shared/markdown';

interface MarkdownPreviewProps {
  content: string;
  onToggleChecklist?: (lineIndex: number) => void;
}

const CHECKLIST_REGEX = /^([ \t]*)[-*+][ \t\u3000]+\[([ xX])\](?:[ \t\u3000]+(.*))?$/;
const UL_REGEX = /^([ \t]*)[-*+][ \t\u3000]+(.+)$/;
const OL_REGEX = /^([ \t]*)(\d+)[.)][ \t\u3000]+(.+)$/;
const HEADING_REGEX = /^[ \t]*(#{1,6})[ \t\u3000]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const BLOCKQUOTE_REGEX = /^[ \t]*>[ \t\u3000]?(.*)$/;
const HR_REGEX = /^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const TABLE_SEP_REGEX = /^\|?(?:[ \t]*:?-{3,}:?[ \t]*\|)+[ \t]*:?-{3,}:?[ \t]*\|?$/;

const INLINE_TOKEN_REGEX =
  /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+)/g;

function getIndentLevel(indent: string): number {
  const expanded = indent.replace(/\t/g, '  ');
  return Math.min(Math.floor(expanded.length / 2), 4);
}

function splitTableRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(INLINE_TOKEN_REGEX.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token.slice(0, 12)}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-amber-300"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      nodes.push(
        <strong key={key} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      nodes.push(
        <del key={key} className="text-gray-500">
          {token.slice(2, -2)}
        </del>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key} className="italic text-gray-200">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon underline decoration-neon/40 underline-offset-2 hover:decoration-neon"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neon underline decoration-neon/40 underline-offset-2 hover:decoration-neon break-all"
        >
          {token}
        </a>,
      );
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export default function MarkdownPreview({
  content,
  onToggleChecklist,
}: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className="py-12 text-center text-sm text-gray-600">
        プレビューする内容がありません
      </div>
    );
  }

  const lines = normalizeLineEndings(content).split('\n');
  const elements: React.ReactNode[] = [];

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
      elements.push(
        <div
          key={`code-${startIndex}`}
          className="my-3 overflow-hidden rounded-xl border border-white/10 bg-white/5"
        >
          {lang && (
            <div className="border-b border-white/5 px-3.5 py-1 text-[10px] font-mono uppercase tracking-wider text-gray-500">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-gray-200 noir-scrollbar">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>,
      );
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
      elements.push(
        <div
          key={`table-${startIndex}`}
          className="my-3 overflow-x-auto rounded-xl border border-white/10 noir-scrollbar"
        >
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-white/5 text-gray-300">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="border-b border-white/10 px-3 py-2 font-bold"
                  >
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-white/3">
                  {headers.map((_, colIdx) => (
                    <td key={colIdx} className="px-3 py-2">
                      {renderInline(row[colIdx] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} className="h-3" />);
      i += 1;
      continue;
    }

    // Horizontal rule
    if (HR_REGEX.test(line)) {
      elements.push(
        <hr key={`hr-${i}`} className="my-4 border-t border-white/10" />,
      );
      i += 1;
      continue;
    }

    // Headings (H1 - H6)
    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const headingClasses: Record<number, string> = {
        1: 'mt-6 mb-2.5 text-2xl font-bold text-white border-b border-white/10 pb-2 tracking-tight',
        2: 'mt-5 mb-2 text-xl font-bold text-white tracking-tight',
        3: 'mt-4 mb-1.5 text-lg font-bold text-gray-100',
        4: 'mt-3 mb-1 text-base font-bold text-gray-200',
        5: 'mt-2.5 mb-1 text-sm font-bold text-gray-300 uppercase tracking-wide',
        6: 'mt-2 mb-1 text-xs font-bold text-gray-400 uppercase tracking-wider',
      };
      elements.push(
        <div key={`h-${i}`} className={headingClasses[level] ?? headingClasses[3]}>
          {renderInline(text)}
        </div>,
      );
      i += 1;
      continue;
    }

    // Checklist item (interactive)
    const checklistMatch = line.match(CHECKLIST_REGEX);
    if (checklistMatch) {
      const lineIdx = i;
      const indentLevel = getIndentLevel(checklistMatch[1]);
      const isChecked = checklistMatch[2].toLowerCase() === 'x';
      const label = checklistMatch[3] ?? '';

      elements.push(
        <button
          key={`check-${lineIdx}`}
          type="button"
          onClick={() => {
            triggerHaptics(8);
            onToggleChecklist?.(lineIdx);
          }}
          style={{ paddingLeft: `${indentLevel * 20}px` }}
          className="group flex w-full items-start gap-3 rounded-lg py-1.5 px-1 text-left transition-colors hover:bg-white/5"
        >
          <span
            className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all ${
              isChecked
                ? 'border-neon bg-neon text-white shadow-[0_0_8px_rgba(0,112,243,0.45)]'
                : 'border-white/25 bg-black/40 group-hover:border-neon/70'
            }`}
          >
            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
          </span>
          <span
            className={`flex-1 text-sm leading-relaxed transition-colors ${
              isChecked ? 'text-gray-500 line-through' : 'text-gray-200'
            }`}
          >
            {renderInline(label)}
          </span>
        </button>,
      );
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
      elements.push(
        <blockquote
          key={`quote-${startIndex}`}
          className="my-2 space-y-1 rounded-r-lg border-l-2 border-neon/60 bg-white/3 py-2 pl-3.5 pr-3 text-sm leading-relaxed text-gray-400"
        >
          {quoteLines.map((qLine, qIdx) => (
            <p key={qIdx}>{renderInline(qLine)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Unordered list (supports -, *, + and nested indent styles)
    const ulMatch = line.match(UL_REGEX);
    if (ulMatch) {
      const indentLevel = getIndentLevel(ulMatch[1]);
      const bulletStyle =
        indentLevel === 0
          ? 'h-1.5 w-1.5 rounded-full bg-neon/80'
          : indentLevel === 1
            ? 'h-1.5 w-1.5 rounded-full border border-gray-400 bg-transparent'
            : 'h-1.5 w-1.5 rounded-[2px] bg-gray-500';
      elements.push(
        <div
          key={`ul-${i}`}
          style={{ paddingLeft: `${indentLevel * 20}px` }}
          className="flex items-start gap-2.5 py-0.5 text-sm leading-relaxed text-gray-200"
        >
          <span className={`mt-2 shrink-0 ${bulletStyle}`} />
          <span className="flex-1">{renderInline(ulMatch[2])}</span>
        </div>,
      );
      i += 1;
      continue;
    }

    // Ordered list
    const olMatch = line.match(OL_REGEX);
    if (olMatch) {
      const indentLevel = getIndentLevel(olMatch[1]);
      elements.push(
        <div
          key={`ol-${i}`}
          style={{ paddingLeft: `${indentLevel * 20}px` }}
          className="flex items-start gap-2 py-0.5 text-sm leading-relaxed text-gray-200"
        >
          <span className="min-w-5 shrink-0 pt-0.5 font-mono text-xs text-neon/80">
            {olMatch[2]}.
          </span>
          <span className="flex-1">{renderInline(olMatch[3])}</span>
        </div>,
      );
      i += 1;
      continue;
    }

    // Paragraph line
    elements.push(
      <p key={`p-${i}`} className="py-0.5 text-sm leading-relaxed text-gray-200">
        {renderInline(line)}
      </p>,
    );
    i += 1;
  }

  return <div className="space-y-0.5 pb-6">{elements}</div>;
}
