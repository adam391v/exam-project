import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardList,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  School,
} from 'lucide-react';
import { useState } from 'react';
import AppButton from '../AppButton';

const menuItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/subjects', label: 'Môn học', icon: BookOpen },
  { path: '/admin/classrooms', label: 'Lớp học', icon: School },
  { path: '/admin/exams', label: 'Đề thi', icon: FileText },
  { path: '/admin/results', label: 'Kết quả', icon: ClipboardList },
  { path: '/admin/users', label: 'Quản trị viên', icon: Users },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const currentPage = menuItems.find((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
              <BookOpen className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">ExamOnline</h1>
              <p className="text-[10px] text-slate-400 -mt-0.5">Quản trị hệ thống</p>
            </div>
            <AppButton variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100" icon={<X className="w-5 h-5" />} />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">
                  {user?.fullName?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-xs text-slate-500 truncate">{user?.role}</p>
              </div>
              <AppButton variant="ghost" size="icon" onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50" title="Đăng xuất" icon={<LogOut className="w-4 h-4" />} />
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 lg:px-8 sticky top-0 z-30">
          <AppButton variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100" icon={<Menu className="w-5 h-5" />} />

          <div className="flex items-center gap-2 text-sm text-slate-500 ml-2 lg:ml-0">
            <span>Quản trị</span>
            {currentPage && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="font-medium text-slate-900">{currentPage.label}</span>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
