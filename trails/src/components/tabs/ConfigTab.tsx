'use client';

import { LogOut, RefreshCw, Calendar, ContactRound } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import packageJson from '../../../package.json';

interface Props {
  appSettings: any;
  onSync: () => void;
  onLogout: () => void;
  onUpdateSettings: (newSettings: any) => void;
}

export default function ConfigTab({
  appSettings,
  onSync,
  onLogout,
  onUpdateSettings,
}: Props) {
  const showTaskInCal = !!appSettings?.showTaskInCal;
  const showGcalInCal = !!appSettings?.showGcalInCal;
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const { addToast } = useToast();

  // トグルが切り替わったときの処理
  const handleToggleTask = () => {
    onUpdateSettings({
      ...appSettings,
      showTaskInCal: !showTaskInCal,
    });
  };

  const handleToggleGoogleEvents = () => {
    onUpdateSettings({
      ...appSettings,
      showGcalInCal: !showGcalInCal,
    });
  };

  const handleSyncGoogleContacts = async () => {
    setIsSyncingContacts(true);

    try {
      const response = await fetch(
        'https://n8n.piova.app/webhook/googleContancts-to-atlas',
        { method: 'GET' },
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result: unknown = await response.json();
      if (
        typeof result !== 'object' ||
        result === null ||
        !('message' in result) ||
        typeof result.message !== 'string' ||
        !('count' in result) ||
        typeof result.count !== 'number' ||
        !Number.isInteger(result.count) ||
        result.count < 0
      ) {
        throw new Error('The sync response was invalid.');
      }

      addToast(`${result.message}: ${result.count} contacts synced.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred.';
      console.error('Google Contacts sync failed:', error);
      addToast(`Google Contacts sync failed: ${message}`, 'alert');
    } finally {
      setIsSyncingContacts(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full p-6 md:p-8 overflow-y-auto no-scrollbar">
      {/* ヘッダー */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      </div>

      {/* 設定項目 */}
      <div className="flex-1 space-y-3">
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 px-1 text-sm font-bold text-gray-500">
            <Calendar className="w-4 h-4" />
            Calendar Display
          </h3>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
            <div className="flex items-center justify-between w-full p-4 text-gray-900 font-bold">
              <span>Show Tasks in Calendar</span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTaskInCal}
                  onChange={handleToggleTask}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${showTaskInCal ? 'bg-primary-500' : 'bg-gray-200'}`}
                />
                <div
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${showTaskInCal ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </label>
            </div>

            <div className="flex items-center justify-between w-full p-4 text-gray-900 font-bold">
              <span>Show Google Events</span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showGcalInCal}
                  onChange={handleToggleGoogleEvents}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${showGcalInCal ? 'bg-primary-500' : 'bg-gray-200'}`}
                />
                <div
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${showGcalInCal ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </label>
            </div>
          </div>
        </section>

        <button
          onClick={onSync}
          className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-primary-300 transition-colors text-gray-900 font-bold"
        >
          <RefreshCw className="w-5 h-5 text-primary-500" />
          Sync with Notion
        </button>

        <button
          type="button"
          onClick={handleSyncGoogleContacts}
          disabled={isSyncingContacts}
          className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-primary-300 disabled:cursor-not-allowed disabled:opacity-60 transition-colors text-gray-900 font-bold"
        >
          <ContactRound className="w-5 h-5 text-primary-500" />
          {isSyncingContacts ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Syncing Google Contacts...
            </>
          ) : (
            'Sync Google Contacts'
          )}
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-red-300 transition-colors text-red-600 font-bold"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      <div className="text-center text-xs text-gray-400 p-4 mt-8">
        Trails {packageJson.version}
      </div>
    </div>
  );
}
