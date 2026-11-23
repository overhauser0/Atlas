import { useState, useEffect, useRef } from 'react';
import { getAutoDeviceName } from '@/lib/device';

export function useAtlasWebSocket(
  onRefreshPieces: () => void,
  onRefreshDiaries: () => void,
) {
  const [wsStatus, setWsStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected');
  const [connectedDevices, setConnectedDevices] = useState<any[]>([]);
  const [ownDeviceId, setOwnDeviceId] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 最新のコールバックを保持する
  const onRefreshPiecesRef = useRef(onRefreshPieces);
  const onRefreshDiariesRef = useRef(onRefreshDiaries);

  useEffect(() => {
    onRefreshPiecesRef.current = onRefreshPieces;
    onRefreshDiariesRef.current = onRefreshDiaries;
  }, [onRefreshPieces, onRefreshDiaries]);

  useEffect(() => {
    let currentDeviceId = localStorage.getItem('trails_device_id');
    if (!currentDeviceId) {
      currentDeviceId = crypto.randomUUID();
      localStorage.setItem('trails_device_id', currentDeviceId);
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
          const data = JSON.parse(event.data);
          if (data.type === 'AUTH_OK') {
            setWsStatus('connected');

            ws.send(
              JSON.stringify({
                type: 'REGISTER_DEVICE',
                clientType: 'trails',
                deviceId: currentDeviceId,
                deviceName: deviceName,
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
          } else if (data.type === 'REFRESH_PIECES') {
            onRefreshPiecesRef.current();
          } else if (data.type === 'REFRESH_DIARIES') {
            onRefreshDiariesRef.current();
            window.dispatchEvent(new Event('refresh_diaries'));
          } else if (data.type === 'REFRESH_PEOPLE') {
            window.dispatchEvent(new Event('refresh_people'));
          } else if (data.type === 'REFRESH_SPARKS') {
            window.dispatchEvent(new Event('refresh_sparks'));
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
  }, []);

  return {
    wsStatus,
    connectedDevices,
    ownDeviceId,
  };
}
