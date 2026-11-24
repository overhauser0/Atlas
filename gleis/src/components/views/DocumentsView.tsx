// src/components/views/DocumentsView.tsx

import { useMemo, useState, type DragEvent } from 'react';
import {
  ExternalLink,
  Plus,
  FileStack,
  Layers,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import { PaperlessDocument, Task } from '@/types';
import { getDateFullString } from '@atlas/shared/date';
import { IconButton } from '@/components/ui/IconButton';
import SearchBar from '@/components/ui/SearchBar';

interface Props {
  documents: PaperlessDocument[];
  isLoading: boolean;
  isUploading: boolean;
  openDocument: (paperlessId: number) => void;
  uploadDocuments: (files: File[]) => Promise<boolean>;
  openTaskModal: (task?: Partial<Task>) => void;
}

export default function DocumentsView({
  documents,
  isLoading,
  isUploading,
  openDocument,
  uploadDocuments,
  openTaskModal,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return documents;
    return documents.filter((doc) =>
      doc.title.toLocaleLowerCase().includes(query),
    );
  }, [documents, searchQuery]);

  // D&Dイベントハンドラ
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);

    if (files.length > 0) {
      // PDFや画像ファイルだけを安全にフィルタリングして送信
      const validFiles = files.filter(
        (f) => f.type === 'application/pdf' || f.type.startsWith('image/'),
      );

      if (validFiles.length > 0) {
        await uploadDocuments(validFiles);
      }
    }
  };

  return (
    <div
      className="relative flex flex-col h-full space-y-4"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ドラッグ中・アップロード中のオーバーレイ */}
      {(isDragging || isUploading) && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-neon/50">
          {isUploading ? (
            <>
              <Loader2 className="w-10 h-10 text-neon animate-spin mb-3" />
              <p className="text-sm font-medium text-white">
                Processing Document...
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Paperless-ngx is working on it
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="w-10 h-10 text-neon mb-3 animate-bounce" />
              <p className="text-sm font-medium text-white">
                Drop PDF to Upload
              </p>
            </>
          )}
        </div>
      )}
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-white/5 bg-white/2 shrink-0">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search documents..."
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 p-4 noir-scrollbar">
          {isLoading ? (
            <div className="text-sm text-gray-500 text-center py-4">
              Searching...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No documents found.
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="group grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto_auto] items-center gap-x-3 gap-y-2 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl cursor-pointer transition-colors sm:flex sm:justify-between"
              >
                <div className="col-start-1 row-span-3 flex min-w-0 flex-col gap-2 sm:flex-row">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileStack className="w-4 h-4 text-gray-400 shrink-0" />
                    <p className="text-sm font-medium text-gray-200 truncate leading-snug">
                      {doc.title}
                    </p>
                  </div>

                  <div className="flex flex-nowrap items-center gap-2 shrink-0">
                    {doc.document_type && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-neon/10 text-neon border border-neon/20 shrink-0">
                        <Layers className="w-3 h-3" />
                        {doc.document_type}
                      </span>
                    )}
                    {doc.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 shrink-0"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {doc.document_date && (
                    <span className="text-xs font-mono text-gray-600 transition-colors group-hover:text-gray-400 sm:hidden">
                      {getDateFullString(doc.document_date)}
                    </span>
                  )}
                </div>

                <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-3 sm:static">
                  {doc.document_date && (
                    <span className="hidden text-xs font-mono text-gray-600 transition-colors group-hover:text-gray-400 sm:inline">
                      {getDateFullString(doc.document_date)}
                    </span>
                  )}

                  <IconButton
                    icon={<Plus />}
                    onClick={() =>
                      openTaskModal({
                        title: doc.title,
                        url: `gleis://document/${doc.paperless_id}`,
                      })
                    }
                    title="タスク化"
                  />
                  <IconButton
                    icon={<ExternalLink />}
                    onClick={() => openDocument(doc.paperless_id)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
