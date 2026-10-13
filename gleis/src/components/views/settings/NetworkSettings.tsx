'use client';

import React from 'react';
import {
  Activity,
  RefreshCw,
  ServerCrash,
  Laptop,
  Smartphone,
} from 'lucide-react';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  clientType: 'extension' | 'gleis' | string;
}

interface Props {
  wsStatus?: 'connected' | 'connecting' | 'disconnected';
  connectedDevices?: DeviceInfo[];
  ownDeviceId?: string;
}

export default function NetworkSettings({
  wsStatus = 'connecting',
  connectedDevices = [],
  ownDeviceId = '',
}: Props) {
  return (
    <section className="flex flex-col gap-4 max-w-2xl">
      <h2 className="flex items-center gap-2 px-1 noir-label">
        <Activity className="w-3.5 h-3.5" />
        Remote Sync
      </h2>

      <div className="noir-glass rounded-2xl border border-white/5 border-t-white/10 divide-y divide-white/5 overflow-hidden">
        <div className="flex items-center justify-between p-5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/50 border border-white/10">
              {wsStatus === 'connected' && (
                <Activity className="w-4 h-4 text-green-400" />
              )}
              {wsStatus === 'connecting' && (
                <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
              )}
              {wsStatus === 'disconnected' && (
                <ServerCrash className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className="text-sm font-bold text-white">Connection Status</div>
          </div>
          <div
            className={`text-[10px] font-bold tracking-wide px-2 py-1 rounded-md border ${
              wsStatus === 'connected'
                ? 'text-green-400 bg-green-400/10 border-green-400/20'
                : wsStatus === 'connecting'
                  ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                  : 'text-red-400 bg-red-400/10 border-red-400/20'
            }`}
          >
            {wsStatus === 'connected'
              ? 'CONNECTED'
              : wsStatus === 'connecting'
                ? 'CONNECTING...'
                : 'DISCONNECTED'}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wider">
            Active Devices ({connectedDevices.length})
          </div>
          {connectedDevices.length === 0 ? (
            <div className="text-sm text-gray-600 text-center py-4">
              No other devices found.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {connectedDevices.map((device) => {
                const isMe = device.deviceId === ownDeviceId;
                const isExtension = device.clientType === 'extension';
                return (
                  <div
                    key={device.deviceId}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isMe
                        ? 'bg-white/10 border-white/20'
                        : 'bg-black/40 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isExtension ? (
                        <Laptop className="w-4 h-4 text-green-400" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-blue-400" />
                      )}
                      <div className="flex flex-col">
                        <span
                          className={`text-sm font-medium ${isMe ? 'text-white' : 'text-gray-300'}`}
                        >
                          {device.deviceName} {isMe && '(This Device)'}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                          {device.clientType}
                        </span>
                      </div>
                    </div>
                    {isExtension && !isMe && (
                      <div className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md border border-green-400/20">
                        READY
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
