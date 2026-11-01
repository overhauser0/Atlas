import { useCallback, useState } from 'react';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    resolve: null,
  });

  const confirm = useCallback(
    (
      title: string,
      message: React.ReactNode,
      confirmText = 'はい',
      cancelText = 'キャンセル',
    ): Promise<boolean> =>
      new Promise((resolve) => {
        setConfirmState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          resolve,
        });
      }),
    [],
  );

  const handleConfirm = useCallback(() => {
    confirmState.resolve?.(true);
    setConfirmState((current) => ({ ...current, isOpen: false }));
  }, [confirmState.resolve]);

  const handleCancel = useCallback(() => {
    confirmState.resolve?.(false);
    setConfirmState((current) => ({ ...current, isOpen: false }));
  }, [confirmState.resolve]);

  return {
    confirm,
    confirmProps: {
      isOpen: confirmState.isOpen,
      title: confirmState.title,
      message: confirmState.message,
      confirmText: confirmState.confirmText,
      cancelText: confirmState.cancelText,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
