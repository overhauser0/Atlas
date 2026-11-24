'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAutoDeviceName } from '../device';
import { ATLAS_UNAUTHORIZED_EVENT } from '../api';

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
  enabled?: boolean;
  initialStatus?: AtlasWsStatus;
  onMessage?: (data: AtlasWsMessage) => void;
}

export function useAtlasWebSocket({
  clientType,
  deviceIdStorageKey,
  enabled = true,
  initialStatus = 'connecting',
  onMessage,
}: UseAtlasWebSocketOptions) {
  const [wsStatus, setWsStatus] = useState<AtlasWsStatus>(
    enabled ? initialStatus : 'disconnected',
  );
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
    if (!enabled) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsStatus('disconnected');
      setConnectedDevices([]);
      connectFnRef.current = null;
      return;
    }

    let cancelled = false;
    let currentDeviceId = localStorage.getItem(deviceIdStorageKey);
    if (!currentDeviceId) {
      currentDeviceId = crypto.randomUUID();
      localStorage.setItem(deviceIdStorageKey, currentDeviceId);
    }
    setOwnDeviceId(currentDeviceId);
    const deviceName = getAutoDeviceName();

    const connectWebSocket = async () => {
      if (cancelled) return;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
      if (!wsUrl) {
        console.warn('[WS] NEXT_PUBLIC_WS_URL is not configured');
        setWsStatus('disconnected');
        return;
      }

      setWsStatus('connecting');

      let ticket = '';
      try {
        const tokenRes = await fetch('/api/auth/ws-token', {
          method: 'POST',
          credentials: 'same-origin',
        });

        if (cancelled) return;

        if (tokenRes.status === 401) {
          setWsStatus('disconnected');
          window.dispatchEvent(new CustomEvent(ATLAS_UNAUTHORIZED_EVENT));
          return;
        }

        if (!tokenRes.ok) {
          throw new Error(`WS ticket request failed (${tokenRes.status})`);
        }

        const data = (await tokenRes.json()) as { ticket?: string };
        if (!data.ticket) {
          throw new Error('WS ticket missing in response');
        }
        ticket = data.ticket;
      } catch (e) {
        if (cancelled) return;
        console.warn('[WS] Failed to fetch WS ticket. Reconnecting in 5s...', e);
        setWsStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(() => {
          void connectWebSocket();
        }, 5000);
        return;
      }

      if (cancelled) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🌐 Connected to Atlas WebSocket; authenticating...');
        ws.send(
          JSON.stringify({
            type: 'AUTH',
            token: ticket,
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
        if (!cancelled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            void connectWebSocket();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.warn('WebSocket Error:', error);
        ws.close();
      };
    };

    connectFnRef.current = () => {
      void connectWebSocket();
    };
    void connectWebSocket();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clientType, deviceIdStorageKey, enabled]);

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
