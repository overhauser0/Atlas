// src/components/views/DocumentsView.tsx

import React, { useMemo, useState, DragEvent } from 'react';
import {
  Search,
  ExternalLink,
  FileStack,
  Layers,
  UploadCloud,
  Loader2,
  Calendar,
} from 'lucide-react';
import { PaperlessDocument } from '@/hooks/usePaperless';
import { getDateFullString } from '@/utils/dateUtils';

interface Props {
  documents: PaperlessDocument[];
  isLoading: boolean;
  isUploading: boolean;
  openDocument: (paperlessId: number) => void;
  uploadDocuments: (files: File[]) => Promise<boolean>;
}

export const DocumentsView: React.FC<Props> = ({
  documents,
  isLoading,
  isUploading,
  openDocument,
  uploadDocuments,
}) => {
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
      {/* ドラッグ中・アップロード中の美しいオーバーレイ */}
      {(isDragging || isUploading) && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg border-2 border-dashed border-blue-500/50">
          {isUploading ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
              <p className="text-sm font-medium text-blue-200">
                Processing Document...
              </p>
              <p className="text-xs text-blue-300/70 mt-1">
                Paperless-ngx is working on it
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="w-10 h-10 text-blue-400 mb-3 animate-bounce" />
              <p className="text-sm font-medium text-blue-200">
                Drop PDF to Upload
              </p>
            </>
          )}
        </div>
      )}
      <div className="flex flex-col h-full">
        <div className="p-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-500 group-focus-within:text-neon transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
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
                className="group flex items-center justify-between gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex flex-col md:flex-row gap-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileStack className="w-4 h-4 text-gray-400 shrink-0" />
                    <p className="text-sm font-medium text-gray-200 truncate leading-snug">
                      {doc.title}
                    </p>
                  </div>

                  <div className="flex flex-nowrap items-center gap-2 shrink-0">
                    {doc.document_type && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                        <Layers className="w-3 h-3" />
                        {doc.document_type}
                      </span>
                    )}
                    {doc.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 shrink-0"
                      >
                        # {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {doc.document_date && (
                    <span className="text-xs font-mono text-gray-600 group-hover:text-gray-400 transition-colors">
                      {getDateFullString(doc.document_date)}
                    </span>
                  )}
                  <span className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all opacity-100">
                    <ExternalLink
                      className="w-5 h-5"
                      onClick={() => openDocument(doc.paperless_id)}
                    />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
