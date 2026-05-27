export default function DetailModal({ isOpen, onClose, item }: any) {
  if (!isOpen || !item) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-lg mb-2">{item.title}</h2>
        <p className="text-sm text-gray-500 mb-4">
          詳細モーダルは後ほど実装します。
        </p>
        <button
          onClick={onClose}
          className="w-full bg-gray-100 py-2 rounded-lg font-bold text-sm"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
