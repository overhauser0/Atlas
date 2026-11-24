'use client';

import { useCallback } from 'react';
import {
  useAtlasWebSocket as useSharedAtlasWebSocket,
  type AtlasWsMessage,
} from '@atlas/shared/hooks/useAtlasWebSocket';

export function useAtlasWebSocket(
  onRefreshPieces: () => void,
  onRefreshDiaries: () => void,
) {
  const handleMessage = useCallback(
    (data: AtlasWsMessage) => {
      if (data.type === 'REFRESH_PIECES') {
        onRefreshPieces();
      } else if (data.type === 'REFRESH_DIARIES') {
        onRefreshDiaries();
        window.dispatchEvent(new Event('refresh_diaries'));
      } else if (data.type === 'REFRESH_PEOPLE') {
        window.dispatchEvent(new Event('refresh_people'));
      } else if (data.type === 'REFRESH_SPARKS') {
        window.dispatchEvent(new Event('refresh_sparks'));
      }
    },
    [onRefreshPieces, onRefreshDiaries],
  );

  const { wsStatus, connectedDevices, ownDeviceId } = useSharedAtlasWebSocket({
    clientType: 'trails',
    deviceIdStorageKey: 'trails_device_id',
    initialStatus: 'disconnected',
    onMessage: handleMessage,
  });

  return {
    wsStatus,
    connectedDevices,
    ownDeviceId,
  };
}
