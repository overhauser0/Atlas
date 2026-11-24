export const ATLAS_UNAUTHORIZED_EVENT = 'atlas:unauthorized';

export const atlasFetch = async (path: string, options: RequestInit = {}) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `/api/atlas${cleanPath}`;

  const contentType: Record<string, string> =
    options.body instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' };

  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...contentType,
      ...options.headers,
    },
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ATLAS_UNAUTHORIZED_EVENT));
  }

  return response;
};
