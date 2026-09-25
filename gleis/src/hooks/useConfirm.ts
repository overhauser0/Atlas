import { useState, useCallback } from 'react';

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

  // 💡 呼び出すと Promise を返す関数
  const confirm = useCallback(
    (
      title: string,
      message: React.ReactNode,
      confirmText = 'Yes',
      cancelText = 'Cancel',
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          resolve,
        });
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    confirmState.resolve?.(true);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    confirmState.resolve?.(false);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, [confirmState]);

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
