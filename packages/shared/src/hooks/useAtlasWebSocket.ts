'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAutoDeviceName } from '../device';

export interface AtlasDevice {
  deviceId: string;
  deviceName: string;
  clientType: string;
}

export type AtlasWsStatus = 'connecting' | 'connected' | 'disconnected';

export interface AtlasWsMessage {
  type?: string;
  devices?: AtlasDevice[];
  [key: string]: unknown;
}

export interface UseAtlasWebSocketOptions {
  clientType: 'gleis' | 'trails';
  deviceIdStorageKey: string;
  initialStatus?: AtlasWsStatus;
  onMessage?: (data: AtlasWsMessage) => void;
}

export function useAtlasWebSocket({
  clientType,
  deviceIdStorageKey,
  initialStatus = 'connecting',
  onMessage,
}: UseAtlasWebSocketOptions) {
  const [wsStatus, setWsStatus] = useState<AtlasWsStatus>(initialStatus);
  const [connectedDevices, setConnectedDevices] = useState<AtlasDevice[]>([]);
  const [ownDeviceId, setOwnDeviceId] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const connectFnRef = useRef<(() => void) | null>(null);

  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let currentDeviceId = localStorage.getItem(deviceIdStorageKey);
    if (!currentDeviceId) {
      currentDeviceId = crypto.randomUUID();
      localStorage.setItem(deviceIdStorageKey, currentDeviceId);
    }
    setOwnDeviceId(currentDeviceId);
    const deviceName = getAutoDeviceName();

    const connectWebSocket = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
      if (!wsUrl) {
        console.warn('[WS] NEXT_PUBLIC_WS_URL is not configured');
        setWsStatus('disconnected');
        return;
      }

      setWsStatus('connecting');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🌐 Connected to Atlas WebSocket; authenticating...');
        ws.send(
          JSON.stringify({
            type: 'AUTH',
            apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const data: AtlasWsMessage = JSON.parse(event.data);
          if (data.type === 'AUTH_OK') {
            setWsStatus('connected');

            ws.send(
              JSON.stringify({
                type: 'REGISTER_DEVICE',
                clientType,
                deviceId: currentDeviceId,
                deviceName,
              }),
            );

            ws.send(JSON.stringify({ type: 'GET_DEVICES' }));

            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'PING' }));
              }
            }, 30000);
          } else if (data.type === 'DEVICE_LIST') {
            setConnectedDevices(data.devices || []);
          } else {
            onMessageRef.current?.(data);
          }
        } catch (e) {
          console.warn('WS Message Parse Error:', e);
        }
      };

      ws.onclose = (event) => {
        if (event.code === 4003 || event.code === 1008) {
          console.warn(
            `🔒 Atlas WebSocket authentication failed (code: ${event.code})`,
          );
        } else {
          console.warn(
            '🔌 Disconnected from Atlas WebSocket. Reconnecting in 5s...',
          );
        }
        setWsStatus('disconnected');
        setConnectedDevices([]);
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.warn('WebSocket Error:', error);
        ws.close();
      };
    };

    connectFnRef.current = connectWebSocket;
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [clientType, deviceIdStorageKey]);

  const reconnect = useCallback(() => {
    connectFnRef.current?.();
  }, []);

  return {
    wsRef,
    wsStatus,
    connectedDevices,
    ownDeviceId,
    reconnect,
  };
}
