import crypto from 'crypto';

export type AtlasAppName = 'gleis' | 'trails';

export const SESSION_COOKIE_NAME = 'atlas_session';
const DEFAULT_SESSION_TTL_DAYS = 7;

export interface SessionPayload {
  sub: 'atlas-user';
  app: AtlasAppName;
  iat: number;
  exp: number;
}

export const getSessionSecret = (): string | null => {
  const secret = process.env.SESSION_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
};

export const getSessionTtlSeconds = (): number => {
  const raw = process.env.SESSION_TTL_DAYS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  const days =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_DAYS;
  return Math.floor(days * 24 * 60 * 60);
};

const signEncodedPayload = (encodedPayload: string, secret: string): string =>
  crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

const safeEqualStrings = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export const createSessionToken = (
  app: AtlasAppName,
  secret: string,
  ttlSeconds: number = getSessionTtlSeconds(),
  nowSec: number = Math.floor(Date.now() / 1000),
): string => {
  const payload: SessionPayload = {
    sub: 'atlas-user',
    app,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  );
  const signature = signEncodedPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
};

export const verifySessionToken = (
  token: string | null | undefined,
  expectedApp: AtlasAppName,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): SessionPayload | null => {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [encodedPayload, signature] = parts;
  const expectedSig = signEncodedPayload(encodedPayload, secret);
  if (!safeEqualStrings(signature, expectedSig)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<SessionPayload>;

    if (
      decoded.sub !== 'atlas-user' ||
      decoded.app !== expectedApp ||
      typeof decoded.iat !== 'number' ||
      typeof decoded.exp !== 'number'
    ) {
      return null;
    }

    if (nowSec >= decoded.exp) return null;

    return decoded as SessionPayload;
  } catch {
    return null;
  }
};

export const extractCookie = (
  cookieHeader: string | null,
  name: string,
): string | null => {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (key === name) {
      return trimmed.slice(eqIndex + 1).trim();
    }
  }
  return null;
};

export const verifyRequestSession = (
  request: Request,
  expectedApp: AtlasAppName,
): SessionPayload | null => {
  const secret = getSessionSecret();
  if (!secret) return null;

  const token = extractCookie(
    request.headers.get('cookie'),
    SESSION_COOKIE_NAME,
  );
  return verifySessionToken(token, expectedApp, secret);
};

export const isHttpsRequest = (request: Request): boolean => {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (override === 'true') return true;
  if (override === 'false') return false;

  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto) {
    return forwardedProto === 'https';
  }

  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
};

export const buildSessionSetCookieHeader = (
  token: string,
  maxAgeSec: number,
  secure: boolean,
): string =>
  `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;

export const buildClearSessionCookieHeader = (secure: boolean): string =>
  `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;

const getExpectedRequestOrigin = (request: Request): string | null => {
  try {
    const url = new URL(request.url);
    const forwardedProto = request.headers
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim()
      .toLowerCase();
    const protocol = forwardedProto ? `${forwardedProto}:` : url.protocol;
    const host =
      request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
      request.headers.get('host')?.trim() ||
      url.host;
    return host ? `${protocol}//${host}` : null;
  } catch {
    return null;
  }
};

/** CSRF 防御: 状態変更リクエストが同一オリジン由来であることを検証する。 */
export const verifySameOrigin = (request: Request): boolean => {
  const fetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return false;
  }

  const origin = request.headers.get('origin')?.trim();
  if (!origin) return true;

  const expectedOrigin = getExpectedRequestOrigin(request);
  if (!expectedOrigin) return false;

  return origin === expectedOrigin;
};
