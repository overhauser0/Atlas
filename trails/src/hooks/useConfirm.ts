'use client';

import { useConfirm as useSharedConfirm } from '@atlas/shared/hooks/useConfirm';

export function useConfirm() {
  return useSharedConfirm({
    defaultConfirmText: 'はい',
    defaultCancelText: 'キャンセル',
  });
}
