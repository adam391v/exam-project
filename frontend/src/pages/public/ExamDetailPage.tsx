import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examService, examSessionService } from '../../services/data.service';
import { toast } from 'sonner';
import { Clock, FileText, BookOpen, ArrowLeft, User, GraduationCap } from 'lucide-react';

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examService.getOne(id!),
    enabled: !!id,
  });

  const handleStartExam = async () => {
    if (!studentName.trim()) {
      toast.error('Vui lòng nhập họ và tên');
      return;
    }
    if (!studentClass.trim()) {
      toast.error('Vui lòng nhập lớp');
      return;
    }

    setIsStarting(true);
    try {
      const session = await examSessionService.start(id!, studentName.trim(), studentClass.trim());
      navigate(`/take-exam/${session.sessionId}`, {
        state: session,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể bắt đầu bài thi');
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-slate-200 rounded w-1/4" />
          <div className="h-10 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-600">Không tìm thấy đề thi</h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách
      </button>

      {/* Exam Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 sm:px-8 py-6">
          <span className="inline-flex items-center rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white mb-3">
            {exam.subject?.name}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{exam.title}</h1>
          {exam.description && (
            <p className="text-blue-100 mt-2 text-sm">{exam.description}</p>
          )}
        </div>

        {/* Info stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-6 sm:px-8 py-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Thời gian</p>
              <p className="text-sm font-semibold text-slate-900">{exam.duration} phút</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Số câu hỏi</p>
              <p className="text-sm font-semibold text-slate-900">{exam.totalQuestions} câu</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Xem đáp án</p>
              <p className="text-sm font-semibold text-slate-900">{exam.showAnswer ? 'Có' : 'Không'}</p>
            </div>
          </div>
        </div>

        {/* Form nhập thông tin */}
        <div className="px-6 sm:px-8 py-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Thông tin học sinh</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <User className="w-4 h-4 inline mr-1.5 text-slate-400" />
                Họ và tên
              </label>
              <input
                type="text"
                placeholder="Nhập họ và tên của bạn"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('class-input')?.focus()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <GraduationCap className="w-4 h-4 inline mr-1.5 text-slate-400" />
                Lớp
              </label>
              <input
                id="class-input"
                type="text"
                placeholder="VD: 12A1"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleStartExam()}
              />
            </div>

            <button
              onClick={handleStartExam}
              disabled={isStarting || !studentName.trim() || !studentClass.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isStarting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang khởi tạo...
                </>
              ) : (
                'Bắt đầu làm bài'
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-4">
            Sau khi bắt đầu, đồng hồ sẽ đếm ngược. Hết thời gian bài thi sẽ tự động nộp.
          </p>
        </div>
      </div>
    </div>
  );
}
