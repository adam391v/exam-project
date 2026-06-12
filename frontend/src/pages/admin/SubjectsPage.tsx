import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSubjectService } from '../../services/data.service';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import AppModal from '../../components/AppModal';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import type { Subject } from '../../types/api.types';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const subjectSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên môn học'),
  code: z.string().min(1, 'Vui lòng nhập mã môn học'),
  description: z.string().optional(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: '', code: '', description: '', isActive: true, sortOrder: 0 },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subjects', page, search],
    queryFn: () => adminSubjectService.getAll({ page, limit: 10, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (dto: Partial<Subject>) => adminSubjectService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      toast.success('Tạo môn học thành công');
      closeModal();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Lỗi tạo môn học'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<Subject> }) => adminSubjectService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      toast.success('Cập nhật thành công');
      closeModal();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Lỗi cập nhật'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminSubjectService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      toast.success('Đã xoá môn học');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Lỗi xoá'),
  });

  const openCreate = () => {
    setEditingSubject(null);
    reset({ name: '', code: '', description: '', isActive: true, sortOrder: 0 });
    setShowModal(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    reset({
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      isActive: subject.isActive,
      sortOrder: subject.sortOrder,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSubject(null);
  };

  const onSubmit: SubmitHandler<SubjectFormValues> = (values) => {
    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id, dto: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDelete({ isOpen: true, id, name });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Môn học</h1>
          <p className="text-sm text-slate-500 mt-1">Thêm, sửa, xoá các môn học trong hệ thống</p>
        </div>
        <AppButton onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Thêm môn học
        </AppButton>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <AppInput
          type="text"
          placeholder="Tìm kiếm môn học..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Tên</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Mã</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Đề thi</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Câu hỏi</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    Chưa có môn học nào
                  </td>
                </tr>
              ) : (
                data?.data?.map((subject: any) => (
                  <tr key={subject.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{subject.name}</p>
                      {subject.description && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{subject.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono font-medium text-slate-700">{subject.code}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700">{subject._count?.exams || 0}</td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700">{subject._count?.questions || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${subject.isActive ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'}`}>
                        {subject.isActive ? 'Hoạt động' : 'Tắt'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AppButton variant="ghost" size="icon" onClick={() => openEdit(subject)} className="hover:text-blue-600 hover:bg-blue-50" title="Sửa" icon={<Pencil className="w-4 h-4" />} />
                        <AppButton variant="danger-ghost" size="icon" onClick={() => handleDelete(subject.id, subject.name)} title="Xoá" icon={<Trash2 className="w-4 h-4" />} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">
              Trang {data.meta.page} / {data.meta.totalPages} ({data.meta.total} môn)
            </p>
            <div className="flex gap-2">
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Trước
              </AppButton>
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= data.meta.totalPages}
              >
                Sau
              </AppButton>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AppModal
        isOpen={showModal}
        onClose={closeModal}
        title={editingSubject ? 'Sửa môn học' : 'Thêm môn học mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <AppInput
            label="Tên môn học *"
            type="text"
            placeholder="VD: Toán học"
            {...register('name')}
            error={errors.name?.message}
          />
          <AppInput
            label="Mã môn *"
            type="text"
            placeholder="VD: MATH"
            className="font-mono"
            {...register('code', {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase();
              }
            })}
            error={errors.code?.message}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mô tả</label>
            <textarea
              rows={3}
              placeholder="Mô tả ngắn..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              {...register('description')}
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                {...register('isActive')}
              />
              <span className="text-sm text-slate-700">Hoạt động</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700">Thứ tự:</label>
              <AppInput
                type="number"
                className="w-20 text-center"
                {...register('sortOrder', { valueAsNumber: true })}
                error={errors.sortOrder?.message}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <AppButton type="button" variant="secondary" onClick={closeModal} fullWidth>
              Huỷ
            </AppButton>
            <AppButton type="submit" isLoading={createMutation.isPending || updateMutation.isPending} fullWidth>
              {editingSubject ? 'Cập nhật' : 'Tạo mới'}
            </AppButton>
          </div>
        </form>
      </AppModal>

      <ConfirmModal
        isOpen={!!confirmDelete?.isOpen}
        title="Xác nhận xoá môn học"
        message={`Bạn có chắc chắn muốn xoá môn "${confirmDelete?.name}"? Hành động này không thể hoàn tác.`}
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
