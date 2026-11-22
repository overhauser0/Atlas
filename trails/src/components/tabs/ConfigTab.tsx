'use client';

import {
  LogOut,
  RefreshCw,
  Calendar,
  ContactRound,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { atlasFetch } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import packageJson from '../../../package.json';

interface Props {
  appSettings: any;
  onSync: () => Promise<void> | void;
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
  const [isSyncingNotion, setIsSyncingNotion] = useState(false);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isSyncingSparks, setIsSyncingSparks] = useState(false);
  const { addToast } = useToast();

  const handleSyncNotion = async () => {
    setIsSyncingNotion(true);
    try {
      await onSync();
    } finally {
      setIsSyncingNotion(false);
    }
  };

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

  const handleSyncSparks = async () => {
    setIsSyncingSparks(true);

    try {
      const response = await atlasFetch('/sparks/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.message || `Request failed with status ${response.status}`,
        );
      }

      // 同期完了後に未消化Sparksを読み出して最新状態を取得
      let unconsumedCount: number | null = null;
      const sparksRes = await atlasFetch('/sparks', { method: 'GET' });
      if (sparksRes.ok) {
        const sparksJson = await sparksRes.json().catch(() => null);
        const list = Array.isArray(sparksJson)
          ? sparksJson
          : (sparksJson?.data ?? null);
        if (Array.isArray(list)) {
          unconsumedCount = list.length;
        }
      }

      addToast(
        unconsumedCount !== null
          ? `Sparksを同期しました（未消化 ${unconsumedCount} 件）`
          : 'Sparksを同期しました。',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred.';
      console.error('Sparks sync failed:', error);
      addToast(`Sparks sync failed: ${message}`, 'alert');
    } finally {
      setIsSyncingSparks(false);
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
            <h2 className="trails-section-label flex items-center gap-1.5 px-1">
              <RefreshCw className="h-3.5 w-3.5 text-primary-500" />
              Sync
            </h2>
            <div className="trails-card divide-y divide-gray-100 overflow-hidden">
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">
                      Notion
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      PiecesをNotionと同期
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSyncNotion()}
                  disabled={isSyncingNotion}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-2 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSyncingNotion ? 'animate-spin' : ''}`}
                  />
                  {isSyncingNotion ? 'Syncing...' : 'Sync'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <ContactRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">
                      Google Contacts
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      連絡先をPeopleに同期
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSyncGoogleContacts()}
                  disabled={isSyncingContacts}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-2 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSyncingContacts ? 'animate-spin' : ''}`}
                  />
                  {isSyncingContacts ? 'Syncing...' : 'Sync'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">
                      Sparks
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      DiscordからSparksを取得
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSyncSparks()}
                  disabled={isSyncingSparks}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-2 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSyncingSparks ? 'animate-spin' : ''}`}
                  />
                  {isSyncingSparks ? 'Syncing...' : 'Sync'}
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <h2 className="trails-section-label px-1">Account</h2>
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
          </section>

          <div className="pt-4 text-center text-xs text-gray-400">
            Trails {packageJson.version}
          </div>
        </div>
      </div>
    </div>
  );
}
