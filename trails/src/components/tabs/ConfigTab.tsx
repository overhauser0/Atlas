'use client';

import {
  LogOut,
  RefreshCw,
  Calendar,
  ContactRound,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
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
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-5 pt-5 md:px-8 md:pt-8">
      <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        <PageHeader
          icon={<Settings />}
          title="Settings"
          subtitle="表示設定と外部サービス同期"
        />

        <div className="max-w-3xl space-y-6">
          <section className="space-y-2.5">
            <h2 className="trails-section-label flex items-center gap-1.5 px-1">
              <Calendar className="h-3.5 w-3.5 text-primary-500" />
              Calendar Display
            </h2>
            <div className="trails-card divide-y divide-gray-100 overflow-hidden">
              <div className="flex w-full items-center justify-between p-5 font-bold text-gray-900">
                <span className="text-sm">Show Tasks in Calendar</span>
                <label className="relative inline-flex cursor-pointer select-none items-center">
                  <input
                    type="checkbox"
                    checked={showTaskInCal}
                    onChange={handleToggleTask}
                    className="sr-only"
                  />
                  <div
                    className={`h-6 w-11 rounded-full transition-colors ${showTaskInCal ? 'bg-primary-500' : 'bg-gray-200'}`}
                  />
                  <div
                    className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${showTaskInCal ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </label>
              </div>

              <div className="flex w-full items-center justify-between p-5 font-bold text-gray-900">
                <span className="text-sm">Show Google Events</span>
                <label className="relative inline-flex cursor-pointer select-none items-center">
                  <input
                    type="checkbox"
                    checked={showGcalInCal}
                    onChange={handleToggleGoogleEvents}
                    className="sr-only"
                  />
                  <div
                    className={`h-6 w-11 rounded-full transition-colors ${showGcalInCal ? 'bg-primary-500' : 'bg-gray-200'}`}
                  />
                  <div
                    className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${showGcalInCal ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <h2 className="trails-section-label px-1">Sync &amp; Account</h2>
            <div className="space-y-3">
              <button
                type="button"
                onClick={onSync}
                className="trails-card flex w-full items-center gap-4 p-5 text-sm font-bold text-gray-900 transition-colors hover:border-primary-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                  <RefreshCw className="h-5 w-5" />
                </div>
                Sync with Notion
              </button>

              <button
                type="button"
                onClick={handleSyncGoogleContacts}
                disabled={isSyncingContacts}
                className="trails-card flex w-full items-center gap-4 p-5 text-sm font-bold text-gray-900 transition-colors hover:border-primary-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                  <ContactRound className="h-5 w-5" />
                </div>
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
                type="button"
                onClick={onLogout}
                className="trails-card flex w-full items-center gap-4 p-5 text-sm font-bold text-red-600 transition-colors hover:border-red-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <LogOut className="h-5 w-5" />
                </div>
                Sign Out
              </button>
            </div>
          </section>

          <div className="pt-4 text-center text-xs text-gray-400">
            Trails {packageJson.version}
          </div>
        </div>
      </div>
    </div>
  );
}
