import { FileSearch } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center bg-white/5 border-2 border-dashed border-white/10 rounded-3xl">
      <FileSearch className="w-20 h-20 text-white/20" />
      <h3 className="mt-6 text-xl font-bold text-white">لا توجد بيانات</h3>
      <p className="mt-2 text-sm text-gray-400">
        لم يتم العثور على أي بيانات تطابق الفلاتر الحالية.
        <br />
        حاول تغيير النطاق الزمني أو معايير الفلترة.
      </p>
    </div>
  );
}
