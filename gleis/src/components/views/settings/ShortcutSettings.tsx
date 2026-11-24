'use client';

import React from 'react';
import { Keyboard } from 'lucide-react';

export default function ShortcutSettings() {
  return (
    <section className="flex flex-col gap-4 max-w-2xl">
      <h2 className="flex items-center gap-2 px-1 noir-label">
        <Keyboard className="w-3.5 h-3.5" />
        Keyboard Shortcuts
      </h2>

      <div className="noir-glass rounded-2xl border border-white/5 p-5 space-y-3">
        <div className="grid grid-cols-[1fr,auto] gap-4 text-sm">
          <div className="text-gray-400">Command Palette</div>
          <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
            Cmd/Ctrl + K
          </code>

          <div className="text-gray-400">Sync Notion</div>
          <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
            Cmd/Ctrl + S
          </code>

          <div className="text-gray-400">Lock Screen</div>
          <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
            Cmd/Ctrl + L
          </code>

          <div className="text-gray-400">Create New Task</div>
          <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
            Cmd/Ctrl + N
          </code>

          <div className="text-gray-400">Open Action Panel</div>
          <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
            Cmd/Ctrl + A
          </code>

          <div className="text-gray-400">Toggle AI Agent</div>
          <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
            Cmd/Ctrl + J <span className="text-gray-500 ml-1">/ 7</span>
          </code>

          <div className="text-gray-400">Go To View</div>
          <code className="bg-white/5 px-2 py-0.5 rounded text-white font-mono text-xs">
            0 ~ 6, 8 <span className="text-gray-500 ml-1">// View Number</span>
          </code>
        </div>
      </div>
    </section>
  );
}
