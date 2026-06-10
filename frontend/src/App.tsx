import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth.store';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import ExamDetailPage from './pages/public/ExamDetailPage';
import TakeExamPage from './pages/public/TakeExamPage';
import ResultPage from './pages/public/ResultPage';

// Admin Pages
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import SubjectsPage from './pages/admin/SubjectsPage';
import ExamsPage from './pages/admin/ExamsPage';
import ExamDetailAdminPage from './pages/admin/ExamDetailAdminPage';
import ResultsPage from './pages/admin/ResultsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

// Guard component cho Admin routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* ===== PUBLIC ROUTES ===== */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/exams/:id" element={<ExamDetailPage />} />
            <Route path="/results/:sessionId" element={<ResultPage />} />
          </Route>

          {/* Trang làm bài — không dùng layout thường */}
          <Route path="/take-exam/:sessionId" element={<TakeExamPage />} />

          {/* ===== ADMIN ROUTES ===== */}
          <Route path="/admin/login" element={<LoginPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="exams/:id" element={<ExamDetailAdminPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export default App;
