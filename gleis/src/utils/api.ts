export const atlasFetch = async (path: string, options: RequestInit = {}) => {
  // 先頭のロジッシュなスラッシュ重複を防止しつつ、絶対URLを組み立て
  // const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `https://atlas.overhauser0.synology.me/api/v1${cleanPath}`;

  // 共通のヘッダーを自動でセット
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || '',
  };

  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers, // 個別で上書きしたいヘッダーがあれば合流
    },
  });
};
