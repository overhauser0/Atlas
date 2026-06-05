'use client';

import { useEffect } from 'react';
import { Mic } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (text: string) => void;
}

export default function VoiceCaptureModal({
  isOpen,
  onClose,
  onCapture,
}: Props) {
  const { isListening, transcript, startListening, stopListening } =
    useVoiceRecognition();

  // モーダルの開閉に合わせてマイクを自動制御
  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopListening();
    }
  }, [isOpen, startListening, stopListening]);

  if (!isOpen) return null;

  const handleCapture = () => {
    stopListening();
    if (transcript.trim()) {
      onCapture(transcript);
    }
    onClose();
  };

  const handleCancel = () => {
    stopListening();
    onClose();
  };

  return (
    // z-[60] で ActionPanel(z-50) よりもさらに前面に出す
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-8 bg-zinc-950/95 backdrop-blur-3xl animate-in fade-in duration-300">
      {/* パルスアニメーションするマイク */}
      <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse mb-8 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
        <Mic className="w-10 h-10 text-red-500" />
      </div>

      <p className="text-red-400 text-xs font-bold tracking-widest uppercase mb-6">
        Listening...
      </p>

      {/* リアルタイムで文字が表示されるエリア */}
      <div className="text-zinc-100 text-xl font-bold text-center min-h-[100px] max-h-48 overflow-y-auto w-full leading-relaxed no-scrollbar">
        {transcript || (
          <span className="text-zinc-600">話しかけてください...</span>
        )}
      </div>

      <div className="w-full mt-auto mb-10 flex flex-col gap-3 max-w-sm">
        <button
          onClick={handleCapture}
          className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 flex justify-center items-center ${
            transcript.trim()
              ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg'
              : 'bg-white/10 text-zinc-500 cursor-not-allowed'
          }`}
          disabled={!transcript.trim()}
        >
          Create Task
        </button>

        <button
          onClick={handleCancel}
          className="py-3 text-zinc-500 hover:text-zinc-300 text-sm font-bold transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
