import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage, Server } from 'http';
import { timingSafeCompare } from './utils';
import { consumeWsTicket } from './ws-ticket';

// 接続中のクライアントに属性を持たせるための型
interface ClientInfo {
  ws: WebSocket;
  authenticated: boolean;
  authTimeout?: ReturnType<typeof setTimeout>;
  clientType?: string; // 'extension' や 'gleis' など
  deviceId?: string;
  deviceName?: string;
}

const WS_AUTH_TIMEOUT_MS = 5000;
const HTTP_URL_REGEX = /^https?:\/\//i;

// 接続中の全クライアントを保持するセット
const connectedClients = new Set<ClientInfo>();

const broadcastDeviceList = () => {
  const devices = Array.from(connectedClients)
    .filter((c) => c.authenticated && c.deviceId) // 認証済みかつID登録済みの端末だけ抽出
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
    if (client.authenticated && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
};

let wss: WebSocketServer | null = null;

export const initWebSocket = (server: Server) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const expectedKey = process.env.ATLAS_API_KEY;
    if (!expectedKey) {
      console.warn('[WS] ATLAS_API_KEY is not configured; rejecting connection');
      ws.close(1008, 'Server API key not configured');
      return;
    }

    // 非ブラウザクライアント向け: Upgrade リクエストの X-API-KEY ヘッダーで即時認証
    const headerApiKey = req.headers['x-api-key'];
    const isHeaderAuthenticated =
      typeof headerApiKey === 'string' &&
      timingSafeCompare(headerApiKey, expectedKey);

    const clientInfo: ClientInfo = {
      ws,
      authenticated: isHeaderAuthenticated,
    };
    connectedClients.add(clientInfo);

    if (isHeaderAuthenticated) {
      console.log('🟢 WebSocket Client Connected (Header Authenticated)');
      ws.send(JSON.stringify({ type: 'AUTH_OK' }));
    } else {
      console.log('🟡 WebSocket Client Connected (Awaiting AUTH)');
      clientInfo.authTimeout = setTimeout(() => {
        if (!clientInfo.authenticated && ws.readyState === WebSocket.OPEN) {
          console.warn('[WS] Authentication timeout; closing connection');
          ws.close(4001, 'Authentication timeout');
        }
      }, WS_AUTH_TIMEOUT_MS);
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // 未認証クライアントは AUTH メッセージのみ受け付ける
        if (!clientInfo.authenticated) {
          const isValidTicket =
            data.type === 'AUTH' &&
            typeof data.token === 'string' &&
            consumeWsTicket(data.token);
          const isValidApiKey =
            data.type === 'AUTH' &&
            typeof data.apiKey === 'string' &&
            timingSafeCompare(data.apiKey, expectedKey);

          if (isValidTicket || isValidApiKey) {
            clientInfo.authenticated = true;
            if (clientInfo.authTimeout) {
              clearTimeout(clientInfo.authTimeout);
              clientInfo.authTimeout = undefined;
            }
            console.log('🟢 WebSocket Client Authenticated');
            ws.send(JSON.stringify({ type: 'AUTH_OK' }));
            return;
          }

          console.warn('[WS] Unauthorized WebSocket message; closing connection');
          ws.close(4003, 'Unauthorized');
          return;
        }

        // ハートビート応答
        if (data.type === 'PING') {
          return;
        }

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
          if (typeof data.url !== 'string' || !HTTP_URL_REGEX.test(data.url)) {
            console.warn('[WS] Rejected non-HTTP(S) URL in OPEN_URL_ON_PC');
            return;
          }

          console.log(`[WS] Relaying URL to PC: ${data.url}`);

          let sent = false;
          connectedClients.forEach((client) => {
            if (
              client.authenticated &&
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
      if (clientInfo.authTimeout) {
        clearTimeout(clientInfo.authTimeout);
      }
      connectedClients.delete(clientInfo);

      if (clientInfo.authenticated && clientInfo.deviceId) {
        broadcastDeviceList();
      }

      console.log('🔴 WebSocket Client Disconnected');
    });
  });
};

// 認証済みのすべてのクライアントに合図を一斉送信する関数
export const broadcast = (message: string) => {
  if (!wss) return;
  connectedClients.forEach((client) => {
    if (client.authenticated && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
};
