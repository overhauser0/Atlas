'use client';

import React from 'react';
import { Check } from 'lucide-react';
import {
  parseMarkdownBlocks,
  parseMarkdownInline,
} from '@atlas/shared/markdown';

interface MarkdownPreviewProps {
  content: string;
  onToggleChecklist?: (lineIndex: number) => void;
}

const HEADING_CLASSES: Record<number, string> = {
  1: 'mt-5 mb-2.5 text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2 tracking-tight',
  2: 'mt-4 mb-2 text-xl font-bold text-gray-900 tracking-tight',
  3: 'mt-3.5 mb-1.5 text-lg font-bold text-gray-800',
  4: 'mt-3 mb-1 text-base font-bold text-gray-800',
  5: 'mt-2.5 mb-1 text-sm font-bold text-gray-700 uppercase tracking-wide',
  6: 'mt-2 mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider',
};

function renderInline(text: string): React.ReactNode[] {
  return parseMarkdownInline(text).map((token, idx) => {
    switch (token.type) {
      case 'code':
        return (
          <code
            key={idx}
            className="rounded bg-primary-50 px-1.5 py-0.5 font-mono text-[0.85em] text-primary-800"
          >
            {token.value}
          </code>
        );
      case 'strong':
        return (
          <strong key={idx} className="font-bold text-gray-950">
            {token.value}
          </strong>
        );
      case 'strike':
        return (
          <del key={idx} className="text-gray-400">
            {token.value}
          </del>
        );
      case 'em':
        return (
          <em key={idx} className="italic text-gray-700">
            {token.value}
          </em>
        );
      case 'link':
        return (
          <a
            key={idx}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline decoration-primary-300 underline-offset-2 hover:decoration-primary-600"
          >
            {token.label}
          </a>
        );
      case 'autolink':
        return (
          <a
            key={idx}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary-600 underline decoration-primary-300 underline-offset-2 hover:decoration-primary-600"
          >
            {token.href}
          </a>
        );
      case 'text':
      default:
        return token.value;
    }
  });
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

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-0.5 pb-6">
      {blocks.map((block) => {
        switch (block.type) {
          case 'code':
            return (
              <div
                key={`code-${block.lineIndex}`}
                className="my-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
              >
                {block.lang && (
                  <div className="border-b border-gray-200/80 px-3.5 py-1 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                    {block.lang}
                  </div>
                )}
                <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-gray-800 trails-scrollbar">
                  <code>{block.code}</code>
                </pre>
              </div>
            );

          case 'table':
            return (
              <div
                key={`table-${block.lineIndex}`}
                className="my-3 overflow-x-auto rounded-2xl border border-gray-200 trails-scrollbar"
              >
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      {block.headers.map((header, idx) => (
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
                    {block.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-gray-50/70">
                        {block.headers.map((_, colIdx) => (
                          <td key={colIdx} className="px-3 py-2">
                            {renderInline(row[colIdx] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'empty':
            return <div key={`empty-${block.lineIndex}`} className="h-3" />;

          case 'hr':
            return (
              <hr
                key={`hr-${block.lineIndex}`}
                className="my-4 border-t border-gray-200"
              />
            );

          case 'heading':
            return (
              <div
                key={`h-${block.lineIndex}`}
                className={HEADING_CLASSES[block.level] ?? HEADING_CLASSES[3]}
              >
                {renderInline(block.text)}
              </div>
            );

          case 'checklist':
            return (
              <button
                key={`check-${block.lineIndex}`}
                type="button"
                onClick={() => onToggleChecklist?.(block.lineIndex)}
                style={{ paddingLeft: `${block.indentLevel * 20}px` }}
                className="group flex w-full items-start gap-3 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-gray-50"
              >
                <span
                  className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all ${
                    block.checked
                      ? 'border-primary-500 bg-primary-500 text-white shadow-xs'
                      : 'border-gray-300 bg-white group-hover:border-primary-400'
                  }`}
                >
                  {block.checked && <Check className="h-3 w-3 stroke-[3]" />}
                </span>
                <span
                  className={`flex-1 text-sm leading-relaxed transition-colors md:text-base ${
                    block.checked
                      ? 'text-gray-400 line-through'
                      : 'text-gray-800'
                  }`}
                >
                  {renderInline(block.label)}
                </span>
              </button>
            );

          case 'blockquote':
            return (
              <blockquote
                key={`quote-${block.lineIndex}`}
                className="my-2 space-y-1 rounded-r-xl border-l-3 border-primary-400 bg-primary-50/50 py-2 pl-3.5 pr-3 text-sm leading-relaxed text-gray-600"
              >
                {block.lines.map((qLine, qIdx) => (
                  <p key={qIdx}>{renderInline(qLine)}</p>
                ))}
              </blockquote>
            );

          case 'ul': {
            const bulletStyle =
              block.indentLevel === 0
                ? 'h-1.5 w-1.5 rounded-full bg-primary-500'
                : block.indentLevel === 1
                  ? 'h-1.5 w-1.5 rounded-full border border-gray-400 bg-transparent'
                  : 'h-1.5 w-1.5 rounded-[2px] bg-gray-400';
            return (
              <div
                key={`ul-${block.lineIndex}`}
                style={{ paddingLeft: `${block.indentLevel * 20}px` }}
                className="flex items-start gap-2.5 py-0.5 text-sm leading-relaxed text-gray-800 md:text-base"
              >
                <span className={`mt-2.5 shrink-0 ${bulletStyle}`} />
                <span className="flex-1">{renderInline(block.text)}</span>
              </div>
            );
          }

          case 'ol':
            return (
              <div
                key={`ol-${block.lineIndex}`}
                style={{ paddingLeft: `${block.indentLevel * 20}px` }}
                className="flex items-start gap-2 py-0.5 text-sm leading-relaxed text-gray-800 md:text-base"
              >
                <span className="min-w-5 shrink-0 pt-0.5 font-mono text-xs font-semibold text-primary-600">
                  {block.marker}.
                </span>
                <span className="flex-1">{renderInline(block.text)}</span>
              </div>
            );

          case 'paragraph':
          default:
            return (
              <p
                key={`p-${block.lineIndex}`}
                className="py-0.5 text-sm leading-relaxed text-gray-800 md:text-base"
              >
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
