'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export interface NotionRichTextItem {
  plain_text: string;
}

export interface NotionBlockContent {
  rich_text?: NotionRichTextItem[];
  checked?: boolean;
}

export interface NotionBlock {
  id: string;
  type?: string;
  has_children?: boolean;
  children_blocks?: NotionBlock[];
  to_do?: NotionBlockContent;
  [blockType: string]: unknown;
}

interface NotionBlockPanelProps {
  blocks: NotionBlock[] | null;
  onClose: () => void;
  onFetchChildren: (id: string) => Promise<NotionBlock[]>;
}

export default function NotionBlockPanel({
  blocks,
  onClose,
  onFetchChildren,
}: NotionBlockPanelProps) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 md:w-96 noir-subglass border-l border-white/10 p-5 z-[60] shadow-2xl animate-fade-in flex flex-col">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10 shrink-0">
        <h3 className="font-bold text-gray-200">Content</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto noir-scrollbar flex-1 pr-2">
        {!blocks || blocks.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-10">
            No content found.
          </div>
        ) : (
          <div className="text-gray-300 text-sm leading-relaxed space-y-1">
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
      </div>
    </div>
  );
}

const getBlockContent = (block: NotionBlock): NotionBlockContent | null => {
  if (!block.type) return null;
  const raw = block[block.type];
  if (typeof raw !== 'object' || raw === null) return null;
  return raw as NotionBlockContent;
};

function NotionBlockNode({
  block,
  depth,
  onFetchChildren,
}: {
  block: NotionBlock;
  depth: number;
  onFetchChildren: (id: string) => Promise<NotionBlock[]>;
}) {
  const [isExpanded, setIsExpanded] = useState(Boolean(block.children_blocks));
  const [childBlocks, setChildBlocks] = useState<NotionBlock[]>(
    block.children_blocks || [],
  );
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    try {
      const data = await onFetchChildren(block.id);
      setChildBlocks(data || []);
      setIsExpanded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleButton = hasChildren ? (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider border align-middle select-none transition-colors ${
        isLoading
          ? 'border-gray-500 text-gray-400 bg-transparent animate-pulse'
          : isExpanded
            ? 'border-gray-600 text-gray-500 bg-transparent hover:bg-white/5'
            : 'border-neon/30 text-neon/80 bg-neon/5 hover:bg-neon/10 cursor-pointer'
      }`}
    >
      {isLoading ? 'LOADING...' : isExpanded ? '- CLOSE' : '+ NESTED'}
    </button>
  ) : null;

  const blockContent = getBlockContent(block);
  let content: JSX.Element | null = null;

  if (!type || !blockContent || !Array.isArray(blockContent.rich_text)) {
    const fallbackText =
      type === 'image' ? '[画像]' : `[${type || 'ブロック'}]`;
    content = (
      <span className="block text-xs text-gray-500 italic my-1 p-2 bg-white/5 rounded border border-white/5">
        {fallbackText} {toggleButton}
      </span>
    );
  } else {
    const textContent = blockContent.rich_text
      .map((item) => item.plain_text)
      .join('');

    switch (type) {
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        content = (
          <strong className="block text-gray-200 mt-3 mb-1 border-b border-white/10 pb-1">
            {textContent} {toggleButton}
          </strong>
        );
        break;
      case 'bulleted_list_item':
        content = (
          <span className="block ml-4 relative before:content-['•'] before:absolute before:-left-3 before:text-gray-500 my-0.5">
            {textContent} {toggleButton}
          </span>
        );
        break;
      case 'numbered_list_item':
        content = (
          <span className="block ml-4 my-0.5">
            {textContent} {toggleButton}
          </span>
        );
        break;
      case 'to_do': {
        const isChecked = Boolean(block.to_do?.checked);
        content = (
          <span
            className={`flex ml-1 my-0.5 items-start gap-2 ${isChecked ? 'text-gray-600 line-through' : ''}`}
          >
            <span className="mt-0.5 shrink-0">{isChecked ? '☑' : '☐'}</span>
            <span>
              {textContent} {toggleButton}
            </span>
          </span>
        );
        break;
      }
      case 'paragraph':
      default:
        if (textContent === '' && !hasChildren) {
          content = <br />;
        } else {
          content = (
            <span className="block my-0.5">
              {textContent} {toggleButton}
            </span>
          );
        }
        break;
    }
  }

  return (
    <div className="flex flex-col mb-1">
      {content}
      {isExpanded && childBlocks.length > 0 && (
        <div className="pl-4 ml-2 border-l border-white/10 mt-1 mb-1 space-y-1">
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
