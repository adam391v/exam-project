import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/data.service';
import {
  Users,
  FileText,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardService.getOverview,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: () => dashboardService.getChartData('daily', 14),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const statCards = [
    { label: 'Tổng học sinh', value: overview.totalStudents, icon: Users, color: 'blue' },
    { label: 'Lượt thi', value: overview.totalExamSessions, icon: TrendingUp, color: 'green' },
    { label: 'Điểm trung bình', value: overview.averageScore, icon: Award, color: 'orange' },
    { label: 'Đề thi', value: overview.totalExams, icon: FileText, color: 'purple' },
    { label: 'Câu hỏi', value: overview.totalQuestions, icon: HelpCircle, color: 'indigo' },
    { label: 'Môn học', value: overview.totalSubjects, icon: BookOpen, color: 'teal' },
  ];

  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', text: 'text-orange-700' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-700' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600', text: 'text-teal-700' },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Tổng quan hệ thống thi trắc nghiệm</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const colors = colorMap[card.color];
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lượt thi theo ngày */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Lượt thi theo ngày</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => v.slice(5)}
                tick={{ fontSize: 12, fill: '#64748B' }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Lượt thi" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Điểm trung bình theo ngày */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Điểm TB theo ngày</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => v.slice(5)}
                tick={{ fontSize: 12, fill: '#64748B' }}
              />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="averageScore"
                stroke="#F97316"
                strokeWidth={2}
                dot={{ fill: '#F97316', r: 4 }}
                name="Điểm TB"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Exams */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Đề thi phổ biến</h3>
          <div className="space-y-3">
            {overview.popularExams.map((exam, idx) => (
              <div key={exam.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-bold text-blue-700">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{exam.title}</p>
                  <p className="text-xs text-slate-500">{exam.subject.name}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {exam._count.examSessions} lượt
                </span>
              </div>
            ))}
            {overview.popularExams.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Chưa có dữ liệu</p>
            )}
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Kết quả gần đây</h3>
          <div className="space-y-3">
            {overview.recentResults.slice(0, 5).map((r, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                    r.result.score >= 7
                      ? 'bg-green-100 text-green-700'
                      : r.result.score >= 5
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {r.result.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.studentName}</p>
                  <p className="text-xs text-slate-500">
                    {r.studentClass} • {r.exam.title}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {r.result.correctAnswers}/{r.result.totalQuestions}
                </span>
              </div>
            ))}
            {overview.recentResults.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
