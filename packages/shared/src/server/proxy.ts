import {
  type AtlasAppName,
  buildClearSessionCookieHeader,
  buildSessionSetCookieHeader,
  createSessionToken,
  getSessionSecret,
  getSessionTtlSeconds,
  isHttpsRequest,
  verifyRequestSession,
  verifySameOrigin,
} from './session';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const jsonResponse = (
  body: unknown,
  status: number,
  extraHeaders?: Record<string, string>,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });

export const getInternalApiUrl = (): string =>
  (process.env.ATLAS_INTERNAL_API_URL || 'http://atlas-server:5675')
    .trim()
    .replace(/\/+$/, '');

const getServerApiKey = (): string => process.env.ATLAS_API_KEY?.trim() || '';

const getForwardedClientIp = (request: Request): string | null => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.trim();
  if (forwardedFor) return forwardedFor;
  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || null;
};

export const isSafeProxyPath = (segments: string[]): boolean => {
  if (!Array.isArray(segments) || segments.length === 0) return false;

  for (const raw of segments) {
    if (!raw || raw === '.' || raw === '..') return false;
    if (raw.includes('/') || raw.includes('\\') || raw.includes('\0')) {
      return false;
    }
    try {
      const decoded = decodeURIComponent(raw);
      if (
        decoded === '.' ||
        decoded === '..' ||
        decoded.includes('/') ||
        decoded.includes('\\') ||
        decoded.includes('\0')
      ) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
};

export const handleLogin = async (
  request: Request,
  app: AtlasAppName,
): Promise<Response> => {
  if (!verifySameOrigin(request)) {
    return jsonResponse({ success: false, error: 'Forbidden origin' }, 403);
  }

  const secret = getSessionSecret();
  if (!secret) {
    console.error('[Auth BFF] SESSION_SECRET is not configured');
    return jsonResponse(
      { success: false, error: 'Server authentication is not configured' },
      500,
    );
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const clientIp = getForwardedClientIp(request);
  if (clientIp) {
    headers['X-Forwarded-For'] = clientIp;
  }

  const upstream = await fetch(`${getInternalApiUrl()}/auth/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ password: body?.password }),
  });

  if (!upstream.ok) {
    const errorBody = await upstream.text();
    const extraHeaders: Record<string, string> = {};
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) extraHeaders['Retry-After'] = retryAfter;

    return new Response(
      errorBody || JSON.stringify({ success: false, error: 'Unauthorized' }),
      {
        status: upstream.status,
        headers: {
          'Content-Type':
            upstream.headers.get('content-type') || 'application/json',
          'Cache-Control': 'no-store',
          ...extraHeaders,
        },
      },
    );
  }

  const ttlSec = getSessionTtlSeconds();
  const token = createSessionToken(app, secret, ttlSec);
  const setCookie = buildSessionSetCookieHeader(
    token,
    ttlSec,
    isHttpsRequest(request),
  );

  return jsonResponse({ success: true }, 200, { 'Set-Cookie': setCookie });
};

export const handleLogout = async (request: Request): Promise<Response> => {
  if (!verifySameOrigin(request)) {
    return jsonResponse({ success: false, error: 'Forbidden origin' }, 403);
  }

  const clearCookie = buildClearSessionCookieHeader(isHttpsRequest(request));
  return jsonResponse({ success: true }, 200, { 'Set-Cookie': clearCookie });
};

export const handleSessionCheck = async (
  request: Request,
  app: AtlasAppName,
): Promise<Response> => {
  const session = verifyRequestSession(request, app);
  return jsonResponse({ authenticated: Boolean(session) }, 200);
};

export const handleWsToken = async (
  request: Request,
  app: AtlasAppName,
): Promise<Response> => {
  if (!verifySameOrigin(request)) {
    return jsonResponse({ success: false, error: 'Forbidden origin' }, 403);
  }

  const session = verifyRequestSession(request, app);
  if (!session) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  const apiKey = getServerApiKey();
  if (!apiKey) {
    console.error('[Auth BFF] ATLAS_API_KEY is not configured');
    return jsonResponse(
      { success: false, error: 'Server API key is not configured' },
      500,
    );
  }

  const upstream = await fetch(`${getInternalApiUrl()}/api/v1/auth/ws-ticket`, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
    },
  });

  if (!upstream.ok) {
    return jsonResponse(
      { success: false, error: 'Failed to issue WebSocket ticket' },
      upstream.status >= 500 ? 502 : upstream.status,
    );
  }

  const data = (await upstream.json()) as {
    ticket: string;
    expiresInSec?: number;
  };
  return jsonResponse(data, 200);
};

export const handleAtlasProxy = async (
  request: Request,
  pathSegments: string[],
  app: AtlasAppName,
): Promise<Response> => {
  const method = request.method.toUpperCase();
  if (STATE_CHANGING_METHODS.has(method) && !verifySameOrigin(request)) {
    return jsonResponse({ success: false, error: 'Forbidden origin' }, 403);
  }

  const session = verifyRequestSession(request, app);
  if (!session) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  if (!isSafeProxyPath(pathSegments)) {
    return jsonResponse({ success: false, error: 'Invalid API path' }, 400);
  }

  const apiKey = getServerApiKey();
  if (!apiKey) {
    console.error('[API BFF] ATLAS_API_KEY is not configured');
    return jsonResponse(
      { success: false, error: 'Server API key is not configured' },
      500,
    );
  }

  const incomingUrl = new URL(request.url);
  const encodedPath = pathSegments.map(encodeURIComponent).join('/');
  const targetUrl = `${getInternalApiUrl()}/api/v1/${encodedPath}${incomingUrl.search}`;

  const upstreamHeaders = new Headers();
  upstreamHeaders.set('X-API-KEY', apiKey);

  const contentType = request.headers.get('content-type');
  if (contentType) upstreamHeaders.set('Content-Type', contentType);
  const accept = request.headers.get('accept');
  if (accept) upstreamHeaders.set('Accept', accept);

  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers: upstreamHeaders,
  };

  if (method !== 'GET' && method !== 'HEAD' && request.body) {
    init.body = request.body;
    init.duplex = 'half';
  }

  const upstream = await fetch(targetUrl, init);

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get('content-type');
  if (upstreamContentType) {
    responseHeaders.set('Content-Type', upstreamContentType);
  }
  const contentDisposition = upstream.headers.get('content-disposition');
  if (contentDisposition) {
    responseHeaders.set('Content-Disposition', contentDisposition);
  }
  const cacheControl = upstream.headers.get('cache-control');
  responseHeaders.set('Cache-Control', cacheControl || 'no-store');

  if (upstream.status === 204 || upstream.status === 304) {
    return new Response(null, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
};

export const handlePaperlessViewProxy = async (
  request: Request,
  app: AtlasAppName,
): Promise<Response> => {
  const session = verifyRequestSession(request, app);
  if (!session) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  const incomingUrl = new URL(request.url);
  const ticket = incomingUrl.searchParams.get('ticket')?.trim();
  if (!ticket) {
    return jsonResponse({ success: false, error: 'Ticket is required' }, 400);
  }

  const upstream = await fetch(
    `${getInternalApiUrl()}/paperless/view?ticket=${encodeURIComponent(ticket)}`,
    { method: 'GET' },
  );

  const responseHeaders = new Headers();
  responseHeaders.set(
    'Content-Type',
    upstream.headers.get('content-type') || 'application/pdf',
  );
  const contentDisposition = upstream.headers.get('content-disposition');
  if (contentDisposition) {
    responseHeaders.set('Content-Disposition', contentDisposition);
  }
  responseHeaders.set('Cache-Control', 'private, no-store');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
};
