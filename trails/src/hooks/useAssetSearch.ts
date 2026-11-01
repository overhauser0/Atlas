import useSWR from 'swr';
import { atlasFetch } from '@/utils/api';
import { Asset } from '@/components/ui/AssetGrid';

interface AssetSearchFilters {
  date?: string;
  personId?: string;
}

const searchFetcher = async (
  url: string,
  args: { arg: AssetSearchFilters },
): Promise<Asset[]> => {
  const res = await atlasFetch(url, {
    method: 'POST',
    body: JSON.stringify(args.arg),
  });
  if (!res.ok) throw new Error(`写真の検索に失敗しました (${res.status})`);
  const json: { data?: Asset[] } = await res.json();
  if (!Array.isArray(json.data)) {
    throw new Error('写真の検索結果の形式が正しくありません');
  }
  return json.data;
};

// 検索パラメーターを文字列化してSWRのキャッシュキーにする
export function useAssetSearch(filters: AssetSearchFilters | null) {
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
