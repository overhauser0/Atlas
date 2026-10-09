'use client';

import React from 'react';
import { Monitor, Cpu, Activity, Keyboard, Repeat, Bell } from 'lucide-react';

// --- Sub Components ---
import GeneralSettings from './settings/GeneralSettings';
import AiAgentSettings from './settings/AiAgentSettings';
import RoutineSettings from './settings/RoutineSettings';
import NetworkSettings from './settings/NetworkSettings';
import ShortcutSettings from './settings/ShortcutSettings';
import NotificationsView from './settings/Notifications';
import { DeviceInfo, Task } from '@/types';

interface Props {
  appSettings: any;
  setAppSettings: (s: any) => void;
  wsStatus?: 'connected' | 'connecting' | 'disconnected';
  connectedDevices?: DeviceInfo[];
  ownDeviceId?: string;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  openTaskModal: (task?: Partial<Task>) => void;
  handleGleisLink: (url: string, callback?: Function) => void;
}

export type SettingsTab =
  | 'general'
  | 'ai'
  | 'routine'
  | 'network'
  | 'shortcuts'
  | 'notifications';

export default function SettingsView({
  appSettings,
  setAppSettings,
  wsStatus = 'connecting',
  connectedDevices = [],
  ownDeviceId = '',
  activeTab,
  onTabChange,
  notifications,
  onMarkAsRead,
  openTaskModal,
  handleGleisLink,
}: Props) {
  const tabs = [
    { id: 'general', label: 'General', icon: Monitor },
    { id: 'ai', label: 'AI Agents', icon: Cpu },
    { id: 'routine', label: 'Routine', icon: Repeat },
    { id: 'network', label: 'Network', icon: Activity },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="flex flex-col h-full mx-auto w-full overflow-hidden">
      {/* --- Tab Navigation --- */}
      <div className="flex-none px-4 pb-4 border-b border-white/5 overflow-x-auto noir-scrollbar">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as SettingsTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
            >
              <tab.icon
                className={`w-4 h-4 ${activeTab === tab.id ? 'text-neon' : ''}`}
              />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- Tab Content Area --- */}
      <div className="flex-1 px-4 pt-4 pb-20 overflow-y-auto noir-scrollbar">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'general' && (
            <GeneralSettings
              appSettings={appSettings}
              setAppSettings={setAppSettings}
            />
          )}

          {activeTab === 'ai' && (
            <AiAgentSettings
              appSettings={appSettings}
              setAppSettings={setAppSettings}
            />
          )}

          {activeTab === 'routine' && <RoutineSettings />}

          {activeTab === 'network' && (
            <NetworkSettings
              wsStatus={wsStatus}
              connectedDevices={connectedDevices}
              ownDeviceId={ownDeviceId}
            />
          )}

          {activeTab === 'shortcuts' && <ShortcutSettings />}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAsRead={onMarkAsRead}
              openTaskModal={openTaskModal}
              handleGleisLink={handleGleisLink}
            />
          )}
        </div>
      </div>
    </div>
  );
}
