// src/components/views/DocumentsView.tsx

import React, { useState, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  Hash,
  FileStack,
  Layers,
  Building2,
} from 'lucide-react';
import { usePaperless } from '@/hooks/usePaperless';

export const DocumentsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { documents, isLoading, searchDocuments, getDocumentViewUrl } =
    usePaperless();

  useEffect(() => {
    const timer = setTimeout(() => {
      searchDocuments(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchDocuments]);

  const openDocument = (paperlessId: number) => {
    const url = getDocumentViewUrl(paperlessId);
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 noir-scrollbar">
        {isLoading ? (
          <div className="text-sm text-gray-500 text-center py-4">
            Searching...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            No documents found.
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center justify-between gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <FileStack className="w-4 h-4 text-gray-400 shrink-0" />
                  <p className="text-sm font-medium text-gray-200 truncate leading-snug">
                    {doc.title}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 overflow-hidden">
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
                      <Hash className="w-3 h-3 opacity-70" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <span className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all opacity-100">
                <ExternalLink
                  className="w-5 h-5"
                  onClick={() => openDocument(doc.paperless_id)}
                />
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
