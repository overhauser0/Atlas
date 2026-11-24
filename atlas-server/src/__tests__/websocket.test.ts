import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { WebSocket } from 'ws';
import { broadcast, initWebSocket } from '../utils/websocket';

describe('websocket authentication and messaging', () => {
  let server: http.Server;
  let wsUrl: string;
  const originalApiKey = process.env.ATLAS_API_KEY;

  beforeEach(async () => {
    process.env.ATLAS_API_KEY = 'test-ws-secret';
    server = http.createServer();
    initWebSocket(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    wsUrl = `ws://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    process.env.ATLAS_API_KEY = originalApiKey;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('closes unauthenticated clients attempting non-AUTH messages with code 4003', async () => {
    const client = new WebSocket(wsUrl);
    const code = await new Promise<number>((resolve) => {
      client.on('open', () =>
        client.send(JSON.stringify({ type: 'GET_DEVICES' })),
      );
      client.on('close', (closeCode) => resolve(closeCode));
    });
    expect(code).toBe(4003);
  });

  it('rejects invalid API key in AUTH message with code 4003', async () => {
    const client = new WebSocket(wsUrl);
    const code = await new Promise<number>((resolve) => {
      client.on('open', () =>
        client.send(JSON.stringify({ type: 'AUTH', apiKey: 'wrong-key' })),
      );
      client.on('close', (closeCode) => resolve(closeCode));
    });
    expect(code).toBe(4003);
  });

  it('authenticates via header and AUTH message, validates OPEN_URL_ON_PC, isolates broadcasts, and updates device list on close', async () => {
    const ext = new WebSocket(wsUrl, {
      headers: { 'x-api-key': 'test-ws-secret' },
    });
    const extMessages: Array<{ type: string; url?: string; devices?: unknown[] }> =
      [];

    await new Promise<void>((resolve) => {
      ext.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        extMessages.push(msg);
        if (msg.type === 'AUTH_OK') {
          ext.send(
            JSON.stringify({
              type: 'REGISTER_DEVICE',
              clientType: 'extension',
              deviceId: 'ext-1',
              deviceName: 'PC',
            }),
          );
        }
        if (msg.type === 'DEVICE_LIST' && msg.devices.length === 1) {
          resolve();
        }
      });
    });

    const gleis = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => {
      gleis.on('open', () =>
        gleis.send(JSON.stringify({ type: 'AUTH', apiKey: 'test-ws-secret' })),
      );
      gleis.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'AUTH_OK') {
          gleis.send(
            JSON.stringify({
              type: 'REGISTER_DEVICE',
              clientType: 'gleis',
              deviceId: 'gleis-1',
              deviceName: 'Phone',
            }),
          );
        }
        if (msg.type === 'DEVICE_LIST' && msg.devices.length === 2) {
          resolve();
        }
      });
    });

    // Reject javascript: and relay https://
    gleis.send(
      JSON.stringify({ type: 'OPEN_URL_ON_PC', url: 'javascript:alert(1)' }),
    );
    gleis.send(
      JSON.stringify({ type: 'OPEN_URL_ON_PC', url: 'https://example.com' }),
    );
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(
      extMessages
        .filter((m) => m.type === 'OPEN_URL_ON_PC')
        .map((m) => m.url),
    ).toEqual(['https://example.com']);

    // Unauthenticated client must not receive broadcast()
    const unauth = new WebSocket(wsUrl);
    let receivedWhileUnauth = false;
    await new Promise<void>((resolve) => unauth.on('open', () => resolve()));
    unauth.on('message', () => {
      receivedWhileUnauth = true;
    });
    broadcast(JSON.stringify({ type: 'REFRESH_PIECES' }));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(receivedWhileUnauth).toBe(false);

    // Disconnecting gleis notifies ext with updated DEVICE_LIST
    const disconnectUpdate = new Promise<void>((resolve) => {
      ext.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (
          msg.type === 'DEVICE_LIST' &&
          msg.devices.length === 1 &&
          msg.devices[0].deviceId === 'ext-1'
        ) {
          resolve();
        }
      });
    });
    gleis.close();
    await disconnectUpdate;

    unauth.close();
    ext.close();
  });

  it('authenticates via single-use WS ticket and rejects replay of the same ticket', async () => {
    const { issueWsTicket, clearWsTickets } = await import('../utils/ws-ticket');
    clearWsTickets();
    const ticket = issueWsTicket();

    const first = new WebSocket(wsUrl);
    const authOk = await new Promise<boolean>((resolve) => {
      first.on('open', () =>
        first.send(JSON.stringify({ type: 'AUTH', token: ticket })),
      );
      first.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'AUTH_OK') resolve(true);
      });
      first.on('close', () => resolve(false));
    });
    expect(authOk).toBe(true);
    first.close();

    const replay = new WebSocket(wsUrl);
    const replayCloseCode = await new Promise<number>((resolve) => {
      replay.on('open', () =>
        replay.send(JSON.stringify({ type: 'AUTH', token: ticket })),
      );
      replay.on('close', (code) => resolve(code));
    });
    expect(replayCloseCode).toBe(4003);
  });
});
