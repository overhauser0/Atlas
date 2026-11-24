'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { normalizeLineEndings } from '@atlas/shared/markdown';

interface MarkdownPreviewProps {
  content: string;
  onToggleChecklist?: (lineIndex: number) => void;
}

const CHECKLIST_REGEX =
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
          className="rounded bg-primary-50 px-1.5 py-0.5 font-mono text-[0.85em] text-primary-800"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      nodes.push(
        <strong key={key} className="font-bold text-gray-950">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      nodes.push(
        <del key={key} className="text-gray-400">
          {token.slice(2, -2)}
        </del>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key} className="italic text-gray-700">
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
            className="text-primary-600 underline decoration-primary-300 underline-offset-2 hover:decoration-primary-600"
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
          className="break-all text-primary-600 underline decoration-primary-300 underline-offset-2 hover:decoration-primary-600"
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
      <div className="py-12 text-center text-sm text-gray-400">
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
          className="my-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
        >
          {lang && (
            <div className="border-b border-gray-200/80 px-3.5 py-1 font-mono text-[10px] uppercase tracking-wider text-gray-400">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-gray-800 trails-scrollbar">
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
          className="my-3 overflow-x-auto rounded-2xl border border-gray-200 trails-scrollbar"
        >
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="border-b border-gray-200 px-3 py-2 font-bold"
                  >
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50/70">
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
        <hr key={`hr-${i}`} className="my-4 border-t border-gray-200" />,
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
        1: 'mt-5 mb-2.5 text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2 tracking-tight',
        2: 'mt-4 mb-2 text-xl font-bold text-gray-900 tracking-tight',
        3: 'mt-3.5 mb-1.5 text-lg font-bold text-gray-800',
        4: 'mt-3 mb-1 text-base font-bold text-gray-800',
        5: 'mt-2.5 mb-1 text-sm font-bold text-gray-700 uppercase tracking-wide',
        6: 'mt-2 mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider',
      };
      elements.push(
        <div
          key={`h-${i}`}
          className={headingClasses[level] ?? headingClasses[3]}
        >
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
          onClick={() => onToggleChecklist?.(lineIdx)}
          style={{ paddingLeft: `${indentLevel * 20}px` }}
          className="group flex w-full items-start gap-3 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-gray-50"
        >
          <span
            className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all ${
              isChecked
                ? 'border-primary-500 bg-primary-500 text-white shadow-xs'
                : 'border-gray-300 bg-white group-hover:border-primary-400'
            }`}
          >
            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
          </span>
          <span
            className={`flex-1 text-sm leading-relaxed transition-colors md:text-base ${
              isChecked ? 'text-gray-400 line-through' : 'text-gray-800'
            }`}
          >
            {renderInline(label)}
          </span>
        </button>,
      );
      i += 1;
      continue;
    }

    // Blockquote
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
          className="my-2 space-y-1 rounded-r-xl border-l-3 border-primary-400 bg-primary-50/50 py-2 pl-3.5 pr-3 text-sm leading-relaxed text-gray-600"
        >
          {quoteLines.map((qLine, qIdx) => (
            <p key={qIdx}>{renderInline(qLine)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Unordered list (-, *, + with nested indent styles)
    const ulMatch = line.match(UL_REGEX);
    if (ulMatch) {
      const indentLevel = getIndentLevel(ulMatch[1]);
      const bulletStyle =
        indentLevel === 0
          ? 'h-1.5 w-1.5 rounded-full bg-primary-500'
          : indentLevel === 1
            ? 'h-1.5 w-1.5 rounded-full border border-gray-400 bg-transparent'
            : 'h-1.5 w-1.5 rounded-[2px] bg-gray-400';
      elements.push(
        <div
          key={`ul-${i}`}
          style={{ paddingLeft: `${indentLevel * 20}px` }}
          className="flex items-start gap-2.5 py-0.5 text-sm leading-relaxed text-gray-800 md:text-base"
        >
          <span className={`mt-2.5 shrink-0 ${bulletStyle}`} />
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
          className="flex items-start gap-2 py-0.5 text-sm leading-relaxed text-gray-800 md:text-base"
        >
          <span className="min-w-5 shrink-0 pt-0.5 font-mono text-xs font-semibold text-primary-600">
            {olMatch[2]}.
          </span>
          <span className="flex-1">{renderInline(olMatch[3])}</span>
        </div>,
      );
      i += 1;
      continue;
    }

    // Paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="py-0.5 text-sm leading-relaxed text-gray-800 md:text-base"
      >
        {renderInline(line)}
      </p>,
    );
    i += 1;
  }

  return <div className="space-y-0.5 pb-6">{elements}</div>;
}
