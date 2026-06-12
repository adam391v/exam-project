import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { toast } from 'sonner';
import { BookOpen, LogIn } from 'lucide-react';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setIsLoading(true);
    try {
      const data = await authService.login(values.username, values.password);
      setAuth(data.accessToken, data.user);
      toast.success(`Xin chào, ${data.user.fullName}!`);
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ExamOnline</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập quản trị hệ thống</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="space-y-5">
            <AppInput
              label="Tên đăng nhập"
              type="text"
              placeholder="Nhập tên đăng nhập"
              {...register('username')}
              error={errors.username?.message}
            />

            <AppInput
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
            />

            <AppButton
              type="submit"
              isLoading={isLoading}
              fullWidth
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg"
              icon={!isLoading && <LogIn className="w-4 h-4" />}
            >
              Đăng nhập
            </AppButton>
          </div>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} ExamOnline • Hệ thống thi trắc nghiệm trực tuyến
        </p>
      </div>
    </div>
  );
}
