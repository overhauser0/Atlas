import { useState, useEffect, useRef } from 'react';
import { getAutoDeviceName } from '@/utils/getAutoDeviceName';

export function useAtlasWebSocket(
  onRefreshPieces: (force: boolean) => void,
  onRefreshNotifications: () => void,
) {
  const [wsStatus, setWsStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected');
  const [connectedDevices, setConnectedDevices] = useState<any[]>([]);
  const [ownDeviceId, setOwnDeviceId] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 最新のコールバックを保持する
  const onRefreshPiecesRef = useRef(onRefreshPieces);
  const onRefreshNotificationsRef = useRef(onRefreshNotifications);

  useEffect(() => {
    onRefreshPiecesRef.current = onRefreshPieces;
    onRefreshNotificationsRef.current = onRefreshNotifications;
  }, [onRefreshPieces, onRefreshNotifications]);

  useEffect(() => {
    let currentDeviceId = localStorage.getItem('gleis_device_id');
    if (!currentDeviceId) {
      currentDeviceId = crypto.randomUUID();
      localStorage.setItem('gleis_device_id', currentDeviceId);
    }
    setOwnDeviceId(currentDeviceId);
    const deviceName = getAutoDeviceName();

    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      if (wsRef.current) wsRef.current.close();

      setWsStatus('connecting');

      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL || 'wss://atlas.overhauser0.synology.me';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🌐 Connected to Atlas WebSocket');
        setWsStatus('connected');

        // 接続時に自身をGleis端末としてサーバーに登録
        ws.send(
          JSON.stringify({
            type: 'REGISTER_DEVICE',
            clientType: 'trails',
            deviceId: currentDeviceId,
            deviceName: deviceName,
          }),
        );

        // 現在の接続端末リストを要求
        ws.send(JSON.stringify({ type: 'GET_DEVICES' }));

        // ハートビート開始（30秒ごとにPINGを送信してプロキシの切断を防ぐ）
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'DEVICE_LIST') {
            setConnectedDevices(data.devices || []);
          } else if (data.type === 'REFRESH_PIECES') {
            onRefreshPiecesRef.current(true);
          } else if (data.type === 'REFRESH_NOTIFICATIONS') {
            onRefreshNotificationsRef.current();
          } else if (data.type === 'REFRESH_NOTES') {
            window.dispatchEvent(new Event('refresh_notes'));
          }
        } catch (e) {
          console.warn('WS Message Parse Error:', e);
        }
      };

      ws.onclose = () => {
        console.warn(
          '🔌 Disconnected from Atlas WebSocket. Reconnecting in 5s...',
        );
        setWsStatus('disconnected');
        setConnectedDevices([]); // 切断時はリストをクリア
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.warn('WebSocket Error:', error);
        ws.close(); // エラーが起きたら一度閉じて、oncloseの再接続処理に回す
      };
    };

    // 初回接続スタート
    connectWebSocket();

    // クリーンアップ関数（コンポーネントが破棄された時）
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return {
    wsRef,
    wsStatus,
    connectedDevices,
    ownDeviceId,
  };
}
