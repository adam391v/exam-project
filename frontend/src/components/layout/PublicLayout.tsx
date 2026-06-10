import { Outlet, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">ExamOnline</h1>
                <p className="text-[11px] text-slate-500 -mt-0.5">Thi trắc nghiệm trực tuyến</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                Trang chủ
              </Link>
              <Link to="/admin/login" className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                Giáo viên
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-700">ExamOnline</span>
            </div>
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Hệ thống thi trắc nghiệm trực tuyến
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
