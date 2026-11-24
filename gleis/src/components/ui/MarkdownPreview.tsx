'use client';

import React from 'react';
import { Check } from 'lucide-react';
import {
  parseMarkdownBlocks,
  parseMarkdownInline,
} from '@atlas/shared/markdown';
import { triggerHaptics } from '@/lib/haptics';

interface MarkdownPreviewProps {
  content: string;
  onToggleChecklist?: (lineIndex: number) => void;
}

const HEADING_CLASSES: Record<number, string> = {
  1: 'mt-6 mb-2.5 text-2xl font-bold text-white border-b border-white/10 pb-2 tracking-tight',
  2: 'mt-5 mb-2 text-xl font-bold text-white tracking-tight',
  3: 'mt-4 mb-1.5 text-lg font-bold text-gray-100',
  4: 'mt-3 mb-1 text-base font-bold text-gray-200',
  5: 'mt-2.5 mb-1 text-sm font-bold text-gray-300 uppercase tracking-wide',
  6: 'mt-2 mb-1 text-xs font-bold text-gray-400 uppercase tracking-wider',
};

function renderInline(text: string): React.ReactNode[] {
  return parseMarkdownInline(text).map((token, idx) => {
    switch (token.type) {
      case 'code':
        return (
          <code
            key={idx}
            className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-amber-300"
          >
            {token.value}
          </code>
        );
      case 'strong':
        return (
          <strong key={idx} className="font-bold text-white">
            {token.value}
          </strong>
        );
      case 'strike':
        return (
          <del key={idx} className="text-gray-500">
            {token.value}
          </del>
        );
      case 'em':
        return (
          <em key={idx} className="italic text-gray-200">
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
            className="text-neon underline decoration-neon/40 underline-offset-2 hover:decoration-neon"
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
            className="text-neon underline decoration-neon/40 underline-offset-2 hover:decoration-neon break-all"
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
      <div className="py-12 text-center text-sm text-gray-600">
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
                className="my-3 overflow-hidden rounded-xl border border-white/10 bg-white/5"
              >
                {block.lang && (
                  <div className="border-b border-white/5 px-3.5 py-1 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    {block.lang}
                  </div>
                )}
                <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-gray-200 noir-scrollbar">
                  <code>{block.code}</code>
                </pre>
              </div>
            );

          case 'table':
            return (
              <div
                key={`table-${block.lineIndex}`}
                className="my-3 overflow-x-auto rounded-xl border border-white/10 noir-scrollbar"
              >
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-white/5 text-gray-300">
                    <tr>
                      {block.headers.map((header, idx) => (
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
                    {block.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-white/3">
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
                className="my-4 border-t border-white/10"
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
                onClick={() => {
                  triggerHaptics(8);
                  onToggleChecklist?.(block.lineIndex);
                }}
                style={{ paddingLeft: `${block.indentLevel * 20}px` }}
                className="group flex w-full items-start gap-3 rounded-lg py-1.5 px-1 text-left transition-colors hover:bg-white/5"
              >
                <span
                  className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all ${
                    block.checked
                      ? 'border-neon bg-neon text-white shadow-[0_0_8px_rgba(0,112,243,0.45)]'
                      : 'border-white/25 bg-black/40 group-hover:border-neon/70'
                  }`}
                >
                  {block.checked && <Check className="h-3 w-3 stroke-[3]" />}
                </span>
                <span
                  className={`flex-1 text-sm leading-relaxed transition-colors ${
                    block.checked
                      ? 'text-gray-500 line-through'
                      : 'text-gray-200'
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
                className="my-2 space-y-1 rounded-r-lg border-l-2 border-neon/60 bg-white/3 py-2 pl-3.5 pr-3 text-sm leading-relaxed text-gray-400"
              >
                {block.lines.map((qLine, qIdx) => (
                  <p key={qIdx}>{renderInline(qLine)}</p>
                ))}
              </blockquote>
            );

          case 'ul': {
            const bulletStyle =
              block.indentLevel === 0
                ? 'h-1.5 w-1.5 rounded-full bg-neon/80'
                : block.indentLevel === 1
                  ? 'h-1.5 w-1.5 rounded-full border border-gray-400 bg-transparent'
                  : 'h-1.5 w-1.5 rounded-[2px] bg-gray-500';
            return (
              <div
                key={`ul-${block.lineIndex}`}
                style={{ paddingLeft: `${block.indentLevel * 20}px` }}
                className="flex items-start gap-2.5 py-0.5 text-sm leading-relaxed text-gray-200"
              >
                <span className={`mt-2 shrink-0 ${bulletStyle}`} />
                <span className="flex-1">{renderInline(block.text)}</span>
              </div>
            );
          }

          case 'ol':
            return (
              <div
                key={`ol-${block.lineIndex}`}
                style={{ paddingLeft: `${block.indentLevel * 20}px` }}
                className="flex items-start gap-2 py-0.5 text-sm leading-relaxed text-gray-200"
              >
                <span className="min-w-5 shrink-0 pt-0.5 font-mono text-xs text-neon/80">
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
                className="py-0.5 text-sm leading-relaxed text-gray-200"
              >
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}
