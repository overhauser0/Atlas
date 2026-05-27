import ViewHeader from './ViewHeader';
export default function DiaryView({ onOpenConfig }: any) {
  return (
    <div className="max-w-5xl mx-auto w-full p-5 md:p-8">
      <ViewHeader title="Diary" onOpenConfig={onOpenConfig} />
      <div className="mt-10 p-12 bg-white rounded-3xl border border-dashed border-gray-300 text-center text-gray-400 font-bold">
        Diary (Developing...)
      </div>
    </div>
  );
}
