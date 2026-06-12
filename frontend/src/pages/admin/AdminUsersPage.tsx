import { useState } from 'react';
import AppSelect from '../../components/AppSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUserService } from '../../services/data.service';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import AppModal from '../../components/AppModal';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { useForm, Controller } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const userSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ').or(z.literal('')),
  role: z.string().min(1, 'Vui lòng chọn vai trò'),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { username: '', password: '', fullName: '', email: '', role: 'ADMIN', isActive: true },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => adminUserService.getAll({ page, limit: 10, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (dto: any) => adminUserService.create(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Tạo tài khoản thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => adminUserService.update(id, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Cập nhật thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminUserService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Đã xoá'); },
  });

  const openCreate = () => {
    setEditingId(null);
    reset({ username: '', password: '', fullName: '', email: '', role: 'ADMIN', isActive: true });
    setShowModal(true);
  };

  const openEdit = (user: any) => {
    setEditingId(user.id);
    reset({ username: user.username, password: '', fullName: user.fullName, email: user.email || '', role: user.role, isActive: user.isActive });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); };

  const onSubmit: SubmitHandler<UserFormValues> = (values) => {
    const dto: any = { ...values };
    
    if (editingId) {
      delete dto.username;
      if (!dto.password?.trim()) {
        delete dto.password; // Không đổi pass
      }
      updateMutation.mutate({ id: editingId, dto });
    } else {
      // Validate thêm mới
      if (!dto.username?.trim()) {
        setError('username', { message: 'Vui lòng nhập username' });
        return;
      }
      if (!dto.password?.trim()) {
        setError('password', { message: 'Vui lòng nhập mật khẩu' });
        return;
      }
      createMutation.mutate(dto);
    }
  };

  const roleLabels: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', TEACHER: 'Giáo viên' };
  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20',
    ADMIN: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
    TEACHER: 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản trị viên</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý tài khoản admin và giáo viên</p>
        </div>
        <AppButton onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Thêm tài khoản
        </AppButton>
      </div>

      <div className="max-w-sm">
        <AppInput
          type="text"
          placeholder="Tìm người dùng..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Người dùng</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Username</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vai trò</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">{Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>))}</tr>
              )) : data?.data?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400"><Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />Chưa có tài khoản nào</td></tr>
              ) : data?.data?.map((user: any) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-sm font-semibold text-blue-700">{user.fullName?.charAt(0)}</span></div>
                      <div><p className="font-medium text-slate-900">{user.fullName}</p>{user.email && <p className="text-xs text-slate-500">{user.email}</p>}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded-lg">{user.username}</span></td>
                  <td className="px-6 py-4 text-center"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role] || ''}`}>{roleLabels[user.role] || user.role}</span></td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'}`}>
                      {user.isActive ? 'Hoạt động' : 'Tắt'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <AppButton variant="ghost" size="icon" onClick={() => openEdit(user)} className="hover:text-blue-600 hover:bg-blue-50" icon={<Pencil className="w-4 h-4" />} />
                      <AppButton variant="danger-ghost" size="icon" onClick={() => setConfirmDelete({ isOpen: true, id: user.id, name: user.fullName })} icon={<Trash2 className="w-4 h-4" />} />
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
              <AppButton variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Trước</AppButton>
              <AppButton variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= data.meta.totalPages}>Sau</AppButton>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AppModal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {!editingId && (
            <AppInput
              label="Username *"
              type="text"
              {...register('username')}
              error={errors.username?.message}
            />
          )}
          <AppInput
            label={`Mật khẩu ${editingId ? '(Bỏ trống nếu không đổi)' : '*'}`}
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          <AppInput
            label="Họ tên *"
            type="text"
            {...register('fullName')}
            error={errors.fullName?.message}
          />
          <AppInput
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Vai trò</label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <AppSelect
                    value={{ value: field.value, label: roleLabels[field.value] || field.value }}
                    onChange={(opt) => field.onChange(opt ? String(opt.value) : 'ADMIN')}
                    options={[
                      { value: 'ADMIN', label: 'Admin' },
                      { value: 'TEACHER', label: 'Giáo viên' },
                      { value: 'SUPER_ADMIN', label: 'Super Admin' },
                    ]}
                    isSearchable={false}
                    placeholder="Chọn vai trò"
                    error={errors.role?.message}
                  />
                )}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer self-end pb-2.5">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" {...register('isActive')} />
              <span className="text-sm text-slate-700">Hoạt động</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <AppButton type="button" variant="secondary" onClick={closeModal} fullWidth>Huỷ</AppButton>
            <AppButton type="submit" isLoading={createMutation.isPending || updateMutation.isPending} fullWidth>{editingId ? 'Cập nhật' : 'Tạo mới'}</AppButton>
          </div>
        </form>
      </AppModal>

      <ConfirmModal
        isOpen={!!confirmDelete?.isOpen}
        title="Xác nhận xoá tài khoản"
        message={`Bạn có chắc chắn muốn xoá tài khoản "${confirmDelete?.name}"? Hành động này không thể hoàn tác.`}
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
