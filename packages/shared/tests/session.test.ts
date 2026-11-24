import { describe, it, expect } from 'vitest';
import {
  buildClearSessionCookieHeader,
  buildSessionSetCookieHeader,
  createSessionToken,
  extractCookie,
  isHttpsRequest,
  SESSION_COOKIE_NAME,
  verifySameOrigin,
  verifySessionToken,
} from '../src/server/session';

describe('shared server session', () => {
  const secret = 'test-super-secret-key-at-least-32-chars';

  it('creates and verifies a valid HMAC-signed session token', () => {
    const now = 1_700_000_000;
    const token = createSessionToken('gleis', secret, 3600, now);

    const payload = verifySessionToken(token, 'gleis', secret, now + 100);
    expect(payload).toEqual({
      sub: 'atlas-user',
      app: 'gleis',
      iat: now,
      exp: now + 3600,
    });
  });

  it('rejects tampered tokens, wrong secret, wrong app, and expired tokens', () => {
    const now = 1_700_000_000;
    const token = createSessionToken('gleis', secret, 60, now);

    // Wrong app
    expect(verifySessionToken(token, 'trails', secret, now + 10)).toBeNull();
    // Wrong secret
    expect(verifySessionToken(token, 'gleis', 'other-secret', now + 10)).toBeNull();
    // Expired
    expect(verifySessionToken(token, 'gleis', secret, now + 60)).toBeNull();
    // Tampered payload
    const [payloadPart, sigPart] = token.split('.');
    const tampered = `${payloadPart.slice(0, -1)}A.${sigPart}`;
    expect(verifySessionToken(tampered, 'gleis', secret, now + 10)).toBeNull();
  });

  it('extracts cookie values and builds Set-Cookie headers', () => {
    const token = createSessionToken('trails', secret, 600, 1000);
    const cookieHeader = `foo=bar; ${SESSION_COOKIE_NAME}=${token}; theme=light`;
    expect(extractCookie(cookieHeader, SESSION_COOKIE_NAME)).toBe(token);
    expect(extractCookie(cookieHeader, 'missing')).toBeNull();

    const setCookie = buildSessionSetCookieHeader(token, 600, true);
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=${token}`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Max-Age=600');
    expect(setCookie).toContain('Secure');

    const clearCookie = buildClearSessionCookieHeader(false);
    expect(clearCookie).toContain('Max-Age=0');
    expect(clearCookie).not.toContain('Secure');
  });

  it('detects HTTPS requests via x-forwarded-proto or URL protocol', () => {
    const httpsForwarded = new Request('http://gleis:5676/api/auth/login', {
      headers: { 'x-forwarded-proto': 'https' },
    });
    expect(isHttpsRequest(httpsForwarded)).toBe(true);

    const localHttp = new Request('http://localhost:5676/api/auth/login');
    expect(isHttpsRequest(localHttp)).toBe(false);
  });

  it('validates same-origin headers for CSRF defense', () => {
    const validReq = new Request('http://gleis:5676/api/atlas/pieces', {
      method: 'POST',
      headers: {
        host: 'gleis.example.com',
        'x-forwarded-proto': 'https',
        origin: 'https://gleis.example.com',
        'sec-fetch-site': 'same-origin',
      },
    });
    expect(verifySameOrigin(validReq)).toBe(true);

    const crossSiteReq = new Request('http://gleis:5676/api/atlas/pieces', {
      method: 'POST',
      headers: {
        host: 'gleis.example.com',
        'x-forwarded-proto': 'https',
        origin: 'https://evil.example.com',
        'sec-fetch-site': 'cross-site',
      },
    });
    expect(verifySameOrigin(crossSiteReq)).toBe(false);
  });
});
