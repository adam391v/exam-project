import { useState } from 'react';
import AppSelect from '../../components/AppSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClassroomService } from '../../services/data.service';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, School } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import AppModal from '../../components/AppModal';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { useForm, Controller } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Options khối 1-12
const gradeOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Khối ${i + 1}`,
}));

const classroomSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên lớp'),
  grade: z.number().int().min(1, 'Vui lòng chọn khối'),
  sortOrder: z.number().int(),
});

type ClassroomFormValues = z.infer<typeof classroomSchema>;

export default function ClassroomsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ClassroomFormValues>({
    resolver: zodResolver(classroomSchema),
    defaultValues: { name: '', grade: 1, sortOrder: 0 },
  });

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
    mutationFn: (dto: ClassroomFormValues) => adminClassroomService.create(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-classrooms'] }); toast.success('Tạo lớp học thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<ClassroomFormValues> & { isActive?: boolean } }) => adminClassroomService.update(id, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-classrooms'] }); toast.success('Cập nhật thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminClassroomService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-classrooms'] }); toast.success('Đã xoá'); },
  });

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', grade: 1, sortOrder: 0 });
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    reset({ name: c.name, grade: c.grade, sortOrder: c.sortOrder || 0 });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); };

  const onSubmit: SubmitHandler<ClassroomFormValues> = (values) => {
    if (editingId) { updateMutation.mutate({ id: editingId, dto: values }); }
    else { createMutation.mutate(values); }
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
        <AppButton onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Thêm lớp
        </AppButton>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="max-w-sm">
        <AppInput 
          type="text" 
          placeholder="Tìm tên lớp..." 
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          icon={<Search className="w-4 h-4" />}
        />
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
                      <AppButton variant="ghost" size="icon" onClick={() => openEdit(c)} className="hover:text-blue-600 hover:bg-blue-50" icon={<Pencil className="w-4 h-4" />} />
                      <AppButton variant="danger-ghost" size="icon" onClick={() => setConfirmDelete({ isOpen: true, id: c.id, name: c.name })} icon={<Trash2 className="w-4 h-4" />} />
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
              <AppButton variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Trước</AppButton>
              <AppButton variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= meta.totalPages}>Sau</AppButton>
            </div>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa */}
      <AppModal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId ? 'Sửa lớp học' : 'Thêm lớp học mới'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Khối *</label>
            <Controller
              name="grade"
              control={control}
              render={({ field }) => (
                <AppSelect
                  value={gradeOptions.find(o => o.value === String(field.value)) || null}
                  onChange={(opt) => field.onChange(opt ? Number(opt.value) : 1)}
                  options={gradeOptions}
                  placeholder="Chọn khối"
                  isSearchable={false}
                  error={errors.grade?.message}
                />
              )}
            />
          </div>
          <AppInput
            label="Tên lớp *"
            type="text"
            placeholder="VD: Lớp 10A1"
            {...register('name')}
            error={errors.name?.message}
          />
          <AppInput
            label="Thứ tự hiển thị"
            type="number"
            {...register('sortOrder', { valueAsNumber: true })}
            error={errors.sortOrder?.message}
          />
          <div className="flex gap-3 pt-2">
            <AppButton type="button" variant="secondary" onClick={closeModal} fullWidth>Huỷ</AppButton>
            <AppButton type="submit" isLoading={createMutation.isPending || updateMutation.isPending} fullWidth>
              {editingId ? 'Cập nhật' : 'Tạo mới'}
            </AppButton>
          </div>
        </form>
      </AppModal>

      <ConfirmModal
        isOpen={!!confirmDelete?.isOpen}
        title="Xác nhận xoá lớp học"
        message={`Bạn có chắc chắn muốn xoá lớp "${confirmDelete?.name}"? Các kết quả thi liên quan cũng sẽ bị ảnh hưởng. Hành động này không thể hoàn tác.`}
        onConfirm={() => {
          if (confirmDelete?.id) {
            deleteMutation.mutate(confirmDelete.id);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
