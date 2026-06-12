import { useState, useMemo } from 'react';
import AppSelect from '../../components/AppSelect';
import AppDatePicker from '../../components/AppDatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminExamService, adminSubjectService } from '../../services/data.service';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, X, FileText, CheckCircle, Eye, Link } from 'lucide-react';
import type { Exam } from '../../types/api.types';

export default function ExamsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [form, setForm] = useState({
    title: '', subjectId: '', duration: 30, description: '', isPublic: false,
    showAnswer: true, shuffleQuestions: false, shuffleOptions: false, passingScore: 5,
    startTime: '', endTime: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-exams', page, search],
    queryFn: () => adminExamService.getAll({ page, limit: 10, search: search || '' }),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['admin-subjects-list'],
    queryFn: async () => {
      const result = await adminSubjectService.getAll({ limit: 100 });
      return result.data || [];
    },
  });

  const subjectOptions = useMemo(() =>
    (subjects || []).map((s: any) => ({ value: s.id, label: s.name })),
    [subjects],
  );

  const createMutation = useMutation({
    mutationFn: (dto: any) => adminExamService.create(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); toast.success('Tạo đề thi thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => adminExamService.update(id, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); toast.success('Cập nhật thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminExamService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); toast.success('Đã xoá'); },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => adminExamService.publish(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); toast.success('Đã công khai đề thi'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const openCreate = () => {
    setEditingExam(null);
    setForm({ title: '', subjectId: '', duration: 30, description: '', isPublic: false, showAnswer: true, shuffleQuestions: false, shuffleOptions: false, passingScore: 5, startTime: '', endTime: '' });
    setShowModal(true);
  };

  const openEdit = (exam: Exam) => {
    setEditingExam(exam);
    setForm({
      title: exam.title, subjectId: exam.subject?.id || '', duration: exam.duration,
      description: exam.description || '', isPublic: exam.isPublic, showAnswer: exam.showAnswer,
      shuffleQuestions: exam.shuffleQuestions || false, shuffleOptions: exam.shuffleOptions || false, passingScore: exam.passingScore || 5,
      startTime: exam.startTime ? new Date(exam.startTime).toISOString() : '',
      endTime: exam.endTime ? new Date(exam.endTime).toISOString() : '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingExam(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
    };
    if (editingExam) { updateMutation.mutate({ id: editingExam.id, dto: payload }); }
    else { createMutation.mutate(payload); }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    PUBLISHED: 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
    ARCHIVED: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Nháp',
    PUBLISHED: 'Công khai',
    ARCHIVED: 'Lưu trữ',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Đề thi</h1>
          <p className="text-sm text-slate-500 mt-1">Tạo, chỉnh sửa và quản lý câu hỏi trong từng đề thi</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Tạo đề thi
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Tìm đề thi..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Đề thi</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Môn</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Thời gian</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Câu hỏi</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Lượt thi</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">{Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>))}</tr>
              )) : data?.data?.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400"><FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />Chưa có đề thi nào</td></tr>
              ) : data?.data?.map((exam: any) => (
                <tr key={exam.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <button onClick={() => navigate(`/admin/exams/${exam.id}`)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left transition-colors">
                      {exam.title}
                    </button>
                  </td>
                  <td className="px-6 py-4"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">{exam.subject?.name}</span></td>
                  <td className="px-6 py-4 text-center text-slate-700">{exam.duration} phút</td>
                  <td className="px-6 py-4 text-center font-medium text-slate-700">{exam._count?.questions || exam.totalQuestions || 0}</td>
                  <td className="px-6 py-4 text-center text-slate-700">{exam._count?.examSessions || 0}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[exam.status] || ''}`}>{statusLabels[exam.status] || exam.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/admin/exams/${exam.id}`)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Xem chi tiết"><Eye className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); const url = `${window.location.origin}/exams/${exam.id}`; navigator.clipboard.writeText(url); toast.success('Đã copy link làm bài!'); if (exam.status === 'DRAFT') publishMutation.mutate(exam.id); }} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Xuất bản & Copy link"><Link className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(exam); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Sửa"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { if (window.confirm('Xoá đề thi?')) deleteMutation.mutate(exam.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xoá"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">Trang {data.meta.page} / {data.meta.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 hover:bg-white disabled:opacity-40 transition-all">Trước</button>
              <button onClick={() => setPage(page + 1)} disabled={page >= data.meta.totalPages} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 hover:bg-white disabled:opacity-40 transition-all">Sau</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-slate-900">{editingExam ? 'Sửa đề thi' : 'Tạo đề thi mới'}</h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên đề thi *</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: Kiểm tra Toán Chương 1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Môn học *</label>
                <AppSelect
                  value={subjectOptions.find(o => o.value === form.subjectId) || null}
                  onChange={(opt) => setForm({ ...form, subjectId: opt?.value || '' })}
                  options={subjectOptions}
                  placeholder="-- Chọn môn --"
                  isClearable
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Thời gian (phút) *</label>
                  <input type="number" required min={1} value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 30 })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Điểm đạt</label>
                  <input type="number" min={0} max={10} step={0.5} value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: parseFloat(e.target.value) || 5 })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Thời gian mở đề</label>
                  <AppDatePicker
                    value={form.startTime}
                    onChange={(date) => setForm({ ...form, startTime: date ? date.toISOString() : '' })}
                    placeholder="Chọn thời gian mở đề..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Thời gian đóng đề</label>
                  <AppDatePicker
                    value={form.endTime}
                    onChange={(date) => setForm({ ...form, endTime: date ? date.toISOString() : '' })}
                    placeholder="Chọn thời gian đóng đề..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.showAnswer} onChange={(e) => setForm({ ...form, showAnswer: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-slate-700">Cho xem đáp án</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.shuffleQuestions} onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-slate-700">Trộn câu hỏi</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.shuffleOptions} onChange={(e) => setForm({ ...form, shuffleOptions: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-slate-700">Trộn đáp án</span></label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Huỷ</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all">{editingExam ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
