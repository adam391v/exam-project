import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { toast } from 'sonner';
import { BookOpen, LogIn } from 'lucide-react';
import AppInput from '../../components/AppInput';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.username.trim() || !form.password.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.login(form.username, form.password);
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
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="space-y-5">
            <AppInput
              label="Tên đăng nhập"
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Nhập tên đăng nhập"
            />

            <AppInput
              label="Mật khẩu"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} ExamOnline • Hệ thống thi trắc nghiệm trực tuyến
        </p>
      </div>
    </div>
  );
}
