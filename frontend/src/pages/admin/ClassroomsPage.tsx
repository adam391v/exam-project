import { useState } from 'react';
import AppSelect from '../../components/AppSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClassroomService } from '../../services/data.service';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, X, School } from 'lucide-react';

// Options khối 1-12
const gradeOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Khối ${i + 1}`,
}));

interface ClassroomForm {
  name: string;
  grade: number;
  sortOrder: number;
}

const defaultForm: ClassroomForm = { name: '', grade: 1, sortOrder: 0 };

export default function ClassroomsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassroomForm>({ ...defaultForm });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-classrooms', page, search, filterGrade],
    queryFn: () => adminClassroomService.getAll({
      page, limit: 20,
      search: search || undefined,
      grade: filterGrade,
      sortBy: 'grade', sortOrder: 'asc',
    }),
  });

  const createMutation = useMutation({
    mutationFn: (dto: ClassroomForm) => adminClassroomService.create(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-classrooms'] }); toast.success('Tạo lớp học thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<ClassroomForm> & { isActive?: boolean } }) => adminClassroomService.update(id, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-classrooms'] }); toast.success('Cập nhật thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminClassroomService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-classrooms'] }); toast.success('Đã xoá'); },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({ name: c.name, grade: c.grade, sortOrder: c.sortOrder || 0 });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nhập tên lớp'); return; }
    if (editingId) { updateMutation.mutate({ id: editingId, dto: form }); }
    else { createMutation.mutate(form); }
  };

  const classrooms = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý lớp học</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý danh sách lớp học theo khối</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Thêm lớp
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Tìm tên lớp..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
        </div>
        <div className="w-48">
          <AppSelect
            value={filterGrade ? gradeOptions.find(o => o.value === String(filterGrade)) || null : null}
            onChange={(opt) => { setFilterGrade(opt ? Number(opt.value) : undefined); setPage(1); }}
            options={gradeOptions}
            placeholder="Tất cả khối"
            isClearable
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Tên lớp</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Khối</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Lượt thi</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">{Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>))}</tr>
              )) : classrooms.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400"><School className="w-12 h-12 mx-auto mb-2 text-slate-300" />Chưa có lớp học nào</td></tr>
              ) : classrooms.map((c: any) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><School className="w-4 h-4 text-blue-600" /></div>
                      <span className="font-medium text-slate-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center"><span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20">Khối {c.grade}</span></td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.isActive ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'}`}>
                      {c.isActive ? 'Hoạt động' : 'Tắt'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">{c._count?.examSessions || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { if (window.confirm('Xoá lớp học này?')) deleteMutation.mutate(c.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">Trang {meta.page} / {meta.totalPages} • {meta.total} lớp</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 hover:bg-white disabled:opacity-40 transition-all">Trước</button>
              <button onClick={() => setPage(page + 1)} disabled={page >= meta.totalPages} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 hover:bg-white disabled:opacity-40 transition-all">Sau</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Sửa lớp học' : 'Thêm lớp học mới'}</h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Khối *</label>
                <AppSelect
                  value={gradeOptions.find(o => o.value === String(form.grade)) || null}
                  onChange={(opt) => opt && setForm({ ...form, grade: Number(opt.value) })}
                  options={gradeOptions}
                  placeholder="Chọn khối"
                  isSearchable={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên lớp *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 12A1, 10B2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Thứ tự sắp xếp</label>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Huỷ</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all">
                  {editingId ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
