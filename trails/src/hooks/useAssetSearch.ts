import useSWR from 'swr';
import { atlasFetch } from '@/utils/api';

const searchFetcher = async (url: string, args: { arg: any }) => {
  const res = await atlasFetch(url, {
    method: 'POST',
    body: JSON.stringify(args.arg),
  });
  if (!res.ok) throw new Error('Search failed');
  const json = await res.json();
  return json.data;
};

// 検索パラメーターを文字列化してSWRのキャッシュキーにする
export function useAssetSearch(filters: { date?: string } | null) {
  // filters が null の場合はフェッチしない
  const key = filters ? ['/immich/search', JSON.stringify(filters)] : null;

  const { data, error, isLoading } = useSWR(key, ([url, bodyStr]) =>
    searchFetcher(url, { arg: JSON.parse(bodyStr) }),
  );

  return {
    assets: data,
    isLoading,
    isError: error,
  };
}
