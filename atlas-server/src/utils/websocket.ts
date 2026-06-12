import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

// 接続中のクライアントに属性を持たせるための型
interface ClientInfo {
  ws: WebSocket;
  clientType?: string; // 'extension' や 'gleis' など
  deviceId?: string;
  deviceName?: string;
}

// 接続中の全クライアントを保持するセット
const connectedClients = new Set<ClientInfo>();

const broadcastDeviceList = () => {
  const devices = Array.from(connectedClients)
    .filter((c) => c.deviceId) // IDが登録済みの端末だけ抽出
    .map((c) => ({
      deviceId: c.deviceId,
      deviceName: c.deviceName,
      clientType: c.clientType,
    }));

  const message = JSON.stringify({
    type: 'DEVICE_LIST',
    devices: devices,
  });

  connectedClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
};

let wss: WebSocketServer | null = null;

export const initWebSocket = (server: Server) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    // 新しいクライアントをリストに追加
    const clientInfo: ClientInfo = { ws };
    connectedClients.add(clientInfo);

    console.log('🟢 WebSocket Client Connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // 端末登録されたらリスト配布
        if (data.type === 'REGISTER_DEVICE' || data.type === 'REPORT_ACTIVE') {
          clientInfo.clientType = data.clientType || 'extension';
          clientInfo.deviceId = data.deviceId;
          clientInfo.deviceName = data.deviceName || 'Unknown';

          console.log(`[WS] Device Active: ${clientInfo.deviceName}`);

          broadcastDeviceList();
          return;
        }

        // リスト要求時配布
        if (data.type === 'GET_DEVICES') {
          broadcastDeviceList();
          return;
        }

        // PCで開く
        if (data.type === 'OPEN_URL_ON_PC') {
          console.log(`[WS] Relaying URL to PC: ${data.url}`);

          let sent = false;
          connectedClients.forEach((client) => {
            if (
              client.clientType === 'extension' &&
              client.ws.readyState === WebSocket.OPEN
            ) {
              client.ws.send(
                JSON.stringify({
                  type: 'OPEN_URL_ON_PC',
                  url: data.url,
                }),
              );
              sent = true;
            }
          });

          if (!sent) {
            console.warn(
              '[WS] No active PC extensions found to receive the URL.',
            );
          }
        }
      } catch (e) {
        console.error('[WS] Message parse error:', e);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(clientInfo);

      console.log('🔴 WebSocket Client Disconnected');
    });
  });
};

// 繋がっているすべてのクライアントに合図を一斉送信する関数
export const broadcast = (message: string) => {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};
