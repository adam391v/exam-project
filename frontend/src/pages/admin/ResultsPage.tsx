import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminResultService } from '../../services/data.service';
import { toast } from 'sonner';
import { Search, Trash2, Eye, ClipboardList } from 'lucide-react';

export default function ResultsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-results', page, search],
    queryFn: () => adminResultService.getAll({ page, limit: 10, search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminResultService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-results'] }); toast.success('Đã xoá'); },
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kết quả thi</h1>
        <p className="text-sm text-slate-500 mt-1">Xem tất cả kết quả bài thi của học sinh</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Tìm theo tên, lớp..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Học sinh</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Đề thi</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Điểm</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Đúng/Tổng</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Thời gian nộp</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">{Array.from({ length: 6 }).map((_, j) => (<td key={j} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>))}</tr>
              )) : data?.data?.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400"><ClipboardList className="w-12 h-12 mx-auto mb-2 text-slate-300" />Chưa có kết quả nào</td></tr>
              ) : data?.data?.map((session: any) => (
                <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{session.studentName}</p>
                    <p className="text-xs text-slate-500">{session.studentClass}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-800 line-clamp-1">{session.exam?.title}</p>
                    <p className="text-xs text-slate-400">{session.exam?.subject?.name}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold ${
                      (session.result?.score || 0) >= 7 ? 'bg-green-100 text-green-700' :
                      (session.result?.score || 0) >= 5 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {session.result?.score ?? '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-700">
                    {session.result ? `${session.result.correctAnswers}/${session.result.totalQuestions}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-center text-xs text-slate-500">{formatDate(session.submittedAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/results/${session.id}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Xem chi tiết"><Eye className="w-4 h-4" /></a>
                      <button onClick={() => { if (window.confirm('Xoá kết quả?')) deleteMutation.mutate(session.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xoá"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">Trang {data.meta.page} / {data.meta.totalPages} ({data.meta.total} kết quả)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 hover:bg-white disabled:opacity-40 transition-all">Trước</button>
              <button onClick={() => setPage(page + 1)} disabled={page >= data.meta.totalPages} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 hover:bg-white disabled:opacity-40 transition-all">Sau</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
