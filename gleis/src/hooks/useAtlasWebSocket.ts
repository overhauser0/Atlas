'use client';

import { useCallback } from 'react';
import {
  useAtlasWebSocket as useSharedAtlasWebSocket,
  type AtlasWsMessage,
} from '@atlas/shared/hooks/useAtlasWebSocket';

export function useAtlasWebSocket(
  onRefreshPieces: (force: boolean) => void,
  onRefreshNotifications: () => void,
) {
  const handleMessage = useCallback(
    (data: AtlasWsMessage) => {
      if (data.type === 'REFRESH_PIECES') {
        onRefreshPieces(true);
      } else if (data.type === 'REFRESH_NOTIFICATIONS') {
        onRefreshNotifications();
      } else if (data.type === 'REFRESH_NOTES') {
        window.dispatchEvent(new Event('refresh_notes'));
      }
    },
    [onRefreshPieces, onRefreshNotifications],
  );

  return useSharedAtlasWebSocket({
    clientType: 'gleis',
    deviceIdStorageKey: 'gleis_device_id',
    initialStatus: 'connecting',
    onMessage: handleMessage,
  });
}
