'use client';

import React, { useState } from 'react';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import {
  getNotionBlockContent,
  type NotionBlock,
  type NotionRichTextItem,
} from '@atlas/shared/notion';

interface NotionBodyViewerProps {
  blocks: NotionBlock[] | null;
  isLoading: boolean;
  error: string;
  onRefresh: () => void;
  onFetchChildren: (blockId: string) => Promise<NotionBlock[]>;
}

const isSafeExternalHref = (href: string): boolean =>
  /^https?:\/\//i.test(href);

function RichTextRuns({ items }: { items: NotionRichTextItem[] }) {
  return (
    <>
      {items.map((item, idx) => {
        const annotations = item.annotations ?? {};
        let node: React.ReactNode = item.plain_text;

        if (annotations.code) {
          node = (
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">
              {node}
            </code>
          );
        }
        if (annotations.bold) {
          node = <strong className="font-bold text-gray-900">{node}</strong>;
        }
        if (annotations.italic) {
          node = <em className="italic">{node}</em>;
        }
        if (annotations.strikethrough) {
          node = <del className="line-through text-gray-400">{node}</del>;
        }
        if (annotations.underline) {
          node = <span className="underline">{node}</span>;
        }
        if (item.href && isSafeExternalHref(item.href)) {
          node = (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline decoration-primary-300 underline-offset-2 hover:text-primary-700"
            >
              {node}
            </a>
          );
        }

        return <React.Fragment key={idx}>{node}</React.Fragment>;
      })}
    </>
  );
}

function NotionBlockNode({
  block,
  depth,
  onFetchChildren,
}: {
  block: NotionBlock;
  depth: number;
  onFetchChildren: (blockId: string) => Promise<NotionBlock[]>;
}) {
  const [isExpanded, setIsExpanded] = useState(
    Array.isArray(block.children_blocks),
  );
  const [childBlocks, setChildBlocks] = useState<NotionBlock[]>(
    block.children_blocks ?? [],
  );
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  const type = block.type;
  const hasChildren = Boolean(block.has_children);

  const handleToggle = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    if (childBlocks.length > 0) {
      setIsExpanded(true);
      return;
    }
    setIsLoadingChildren(true);
    try {
      const fetched = await onFetchChildren(block.id);
      setChildBlocks(fetched || []);
      setIsExpanded(true);
    } catch (e) {
      console.error(`Failed to fetch child blocks for ${block.id}:`, e);
    } finally {
      setIsLoadingChildren(false);
    }
  };

  const toggleButton = hasChildren ? (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={isLoadingChildren}
      className={`ml-2 inline-flex items-center rounded border px-1.5 py-0.5 align-middle text-[10px] font-bold tracking-wider transition-colors select-none ${
        isLoadingChildren
          ? 'border-gray-200 bg-gray-50 text-gray-400 animate-pulse'
          : isExpanded
            ? 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
            : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 cursor-pointer'
      }`}
    >
      {isLoadingChildren ? 'LOADING...' : isExpanded ? '- CLOSE' : '+ NESTED'}
    </button>
  ) : null;

  const blockContent = getNotionBlockContent(block);
  let rendered: React.ReactNode = null;

  if (type === 'divider') {
    rendered = <hr className="my-2 border-gray-200" />;
  } else if (!type || !blockContent || !Array.isArray(blockContent.rich_text)) {
    const fallbackText =
      type === 'image' ? '[画像]' : `[${type || 'ブロック'}]`;
    rendered = (
      <span className="my-1 block rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs italic text-gray-500">
        {fallbackText} {toggleButton}
      </span>
    );
  } else {
    const richText = blockContent.rich_text;
    const plainText = richText.map((item) => item.plain_text).join('');

    switch (type) {
      case 'heading_1':
        rendered = (
          <h4 className="mt-3 mb-1 border-b border-gray-100 pb-1 text-base font-bold text-gray-900">
            <RichTextRuns items={richText} /> {toggleButton}
          </h4>
        );
        break;
      case 'heading_2':
        rendered = (
          <h5 className="mt-2.5 mb-1 text-sm font-bold text-gray-900">
            <RichTextRuns items={richText} /> {toggleButton}
          </h5>
        );
        break;
      case 'heading_3':
        rendered = (
          <h6 className="mt-2 mb-0.5 text-sm font-semibold text-gray-800">
            <RichTextRuns items={richText} /> {toggleButton}
          </h6>
        );
        break;
      case 'bulleted_list_item':
        rendered = (
          <div className="relative my-0.5 ml-4 whitespace-pre-wrap break-words before:absolute before:-left-3 before:text-gray-400 before:content-['•']">
            <RichTextRuns items={richText} /> {toggleButton}
          </div>
        );
        break;
      case 'numbered_list_item':
        rendered = (
          <div className="my-0.5 ml-4 whitespace-pre-wrap break-words">
            <RichTextRuns items={richText} /> {toggleButton}
          </div>
        );
        break;
      case 'to_do': {
        const isChecked = Boolean(block.to_do?.checked);
        rendered = (
          <div
            className={`my-0.5 ml-1 flex items-start gap-2 ${
              isChecked ? 'text-gray-400 line-through' : 'text-gray-800'
            }`}
          >
            <span className="mt-0.5 shrink-0">{isChecked ? '☑' : '☐'}</span>
            <span className="whitespace-pre-wrap break-words">
              <RichTextRuns items={richText} /> {toggleButton}
            </span>
          </div>
        );
        break;
      }
      case 'quote':
        rendered = (
          <blockquote className="my-1 border-l-2 border-primary-300 bg-primary-50/40 pl-3 py-1 text-gray-700 whitespace-pre-wrap break-words">
            <RichTextRuns items={richText} /> {toggleButton}
          </blockquote>
        );
        break;
      case 'callout':
        rendered = (
          <div className="my-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-gray-700 whitespace-pre-wrap break-words">
            <RichTextRuns items={richText} /> {toggleButton}
          </div>
        );
        break;
      case 'paragraph':
      default:
        if (plainText === '' && !hasChildren) {
          rendered = <div className="h-3" />;
        } else {
          rendered = (
            <p className="my-0.5 whitespace-pre-wrap break-words text-gray-800">
              <RichTextRuns items={richText} /> {toggleButton}
            </p>
          );
        }
        break;
    }
  }

  return (
    <div className="flex flex-col">
      {rendered}
      {isExpanded && childBlocks.length > 0 && (
        <div className="mt-1 mb-1 ml-2 space-y-1 border-l-2 border-gray-100 pl-3.5">
          {childBlocks.map((childBlock) => (
            <NotionBlockNode
              key={childBlock.id}
              block={childBlock}
              depth={depth + 1}
              onFetchChildren={onFetchChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotionBodyViewer({
  blocks,
  isLoading,
  error,
  onRefresh,
  onFetchChildren,
}: NotionBodyViewerProps) {
  return (
    <section className="bg-white rounded-3xl border border-gray-100 p-5 md:p-6 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-primary-500" />
          <span className="trails-section-label">
            Notion Body{blocks ? ` (${blocks.length})` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Notion本文を再読込"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
          <span>更新</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600"
        >
          {error}
        </div>
      )}

      {isLoading && !blocks ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Notion 本文を読み込み中...</span>
        </div>
      ) : !blocks || blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center text-xs text-gray-400">
          Notion ページ本文はまだありません
        </div>
      ) : (
        <div className="space-y-1.5 text-sm leading-relaxed text-gray-800">
          {blocks.map((block) => (
            <NotionBlockNode
              key={block.id}
              block={block}
              depth={1}
              onFetchChildren={onFetchChildren}
            />
          ))}
        </div>
      )}
    </section>
  );
}
