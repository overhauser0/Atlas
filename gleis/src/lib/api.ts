export const atlasFetch = async (path: string, options: RequestInit = {}) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}/api/v1${cleanPath}`;

  const apiKey: Record<string, string> = {
    'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
  };

  const contentType: Record<string, string> =
    options.body instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' };

  return fetch(url, {
    ...options,
    headers: {
      ...apiKey,
      ...contentType,
      ...options.headers,
    },
  });
};
