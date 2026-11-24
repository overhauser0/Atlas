import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleAtlasProxy,
  handleLogin,
  handleSessionCheck,
  handleWsToken,
  isSafeProxyPath,
} from '../src/server/proxy';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
} from '../src/server/session';

describe('shared server BFF proxy', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-session-secret-0123456789abcdef';
    process.env.ATLAS_API_KEY = 'server-only-api-key';
    process.env.ATLAS_INTERNAL_API_URL = 'http://atlas-server:5675';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('rejects path traversal attempts in isSafeProxyPath', () => {
    expect(isSafeProxyPath(['pieces', '123'])).toBe(true);
    expect(isSafeProxyPath([])).toBe(false);
    expect(isSafeProxyPath(['..', 'auth'])).toBe(false);
    expect(isSafeProxyPath(['pieces', '%2e%2e'])).toBe(false);
    expect(isSafeProxyPath(['pieces\\admin'])).toBe(false);
  });

  it('returns 401 for unauthenticated proxy and ws-token requests', async () => {
    const req = new Request('https://gleis.example.com/api/atlas/pieces');
    const res = await handleAtlasProxy(req, ['pieces'], 'gleis');
    expect(res.status).toBe(401);

    const wsReq = new Request('https://gleis.example.com/api/auth/ws-token', {
      method: 'POST',
    });
    const wsRes = await handleWsToken(wsReq, 'gleis');
    expect(wsRes.status).toBe(401);
  });

  it('verifies password upstream, sets HttpOnly cookie on login, and checks session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const loginReq = new Request('https://gleis.example.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'https://gleis.example.com',
        'x-forwarded-for': '203.0.113.10',
        'x-forwarded-proto': 'https',
        host: 'gleis.example.com',
      },
      body: JSON.stringify({ password: 'correct-password' }),
    });

    const loginRes = await handleLogin(loginReq, 'gleis');
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get('set-cookie');
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://atlas-server:5675/auth/verify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Forwarded-For': '203.0.113.10',
        }),
      }),
    );

    // Session check succeeds with issued cookie
    const cookiePair = setCookie!.split(';')[0];
    const checkReq = new Request('https://gleis.example.com/api/auth/session', {
      headers: { cookie: cookiePair },
    });
    const checkRes = await handleSessionCheck(checkReq, 'gleis');
    expect(await checkRes.json()).toEqual({ authenticated: true });
  });

  it('forwards authenticated API requests with server X-API-KEY and query string', async () => {
    const token = createSessionToken('gleis', process.env.SESSION_SECRET!, 600);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ pieces: [{ id: 'p1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const req = new Request(
      'https://gleis.example.com/api/atlas/pieces?area=Work',
      {
        method: 'GET',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      },
    );

    const res = await handleAtlasProxy(req, ['pieces'], 'gleis');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pieces: [{ id: 'p1' }] });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://atlas-server:5675/api/v1/pieces?area=Work',
      expect.objectContaining({
        method: 'GET',
      }),
    );

    const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = calledInit.headers as Headers;
    expect(headers.get('X-API-KEY')).toBe('server-only-api-key');
  });
});
