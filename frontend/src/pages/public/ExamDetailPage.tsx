import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examService, examSessionService, classroomService } from '../../services/data.service';
import { toast } from 'sonner';
import { Clock, FileText, BookOpen, ArrowLeft, User, GraduationCap } from 'lucide-react';
import AppInput from '../../components/AppInput';
import AppSelect from '../../components/AppSelect';
import AppButton from '../../components/AppButton';

// Options khối 1-12
const gradeOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Khối ${i + 1}`,
}));

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examService.getOne(id!),
    enabled: !!id,
  });

  // Lấy danh sách lớp theo khối
  const { data: classrooms = [], isLoading: isLoadingClassrooms } = useQuery({
    queryKey: ['classrooms-by-grade', selectedGrade],
    queryFn: () => classroomService.getByGrade(selectedGrade!),
    enabled: !!selectedGrade,
  });

  const classroomOptions = useMemo(() =>
    Array.isArray(classrooms) ? classrooms.map((c: any) => ({ value: c.id, label: c.name })) : [],
    [classrooms],
  );

  const selectedClassroom = classroomOptions.find((o: any) => o.value === selectedClassroomId) || null;

  const handleStartExam = async () => {
    if (!studentName.trim()) {
      toast.error('Vui lòng nhập họ và tên');
      return;
    }
    if (!selectedClassroomId) {
      toast.error('Vui lòng chọn lớp');
      return;
    }

    // Lookup tên lớp
    const classroom = classrooms.find((c: any) => c.id === selectedClassroomId);
    const studentClass = classroom?.name || '';

    setIsStarting(true);
    try {
      const session = await examSessionService.start(id!, studentName.trim(), studentClass, selectedClassroomId);
      navigate(`/take-exam/${session.sessionId}`, {
        state: session,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể bắt đầu bài thi');
    } finally {
      setIsStarting(false);
    }
  };

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!exam) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [exam]);

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

  const startTime = exam.startTime ? new Date(exam.startTime) : null;
  const endTime = exam.endTime ? new Date(exam.endTime) : null;
  const isBeforeStart = startTime && now < startTime;
  const isAfterEnd = endTime && now > endTime;
  const isTimeValid = !isBeforeStart && !isAfterEnd;

  let countdownText = 'Chưa tới giờ mở đề';
  if (isBeforeStart && startTime) {
    const diff = startTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    
    const pad = (n: number) => String(n).padStart(2, '0');
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      countdownText = `Bài thi sẽ bắt đầu sau ${days} ngày ${pad(hours % 24)}:${pad(mins)}:${pad(secs)}`;
    } else {
      countdownText = `Bài thi sẽ bắt đầu sau ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Back */}
      <AppButton
        variant="ghost"
        onClick={() => navigate('/')}
        className="text-slate-500 hover:text-blue-600 mb-8 px-0 hover:bg-transparent"
        icon={<ArrowLeft className="w-4 h-4" />}
      >
        Quay lại danh sách
      </AppButton>

      {/* Exam Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm ">
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
          {exam.startTime && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Mở đề</p>
                <p className="text-sm font-semibold text-slate-900">{new Date(exam.startTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          )}
          {exam.endTime && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Đóng đề</p>
                <p className="text-sm font-semibold text-slate-900">{new Date(exam.endTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          )}
        </div>

        {/* Form nhập thông tin */}
        <div className="px-6 sm:px-8 py-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Thông tin học sinh</h2>

          <div className="space-y-5">
            <AppInput
              label={
                <span className="flex items-center">
                  <User className="w-4 h-4 inline mr-1.5 text-slate-400" />
                  Họ và tên
                </span> as any
              }
              type="text"
              placeholder="Nhập họ và tên của bạn"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <GraduationCap className="w-4 h-4 inline mr-1.5 text-slate-400" />
                  Khối
                </label>
                <AppSelect
                  value={selectedGrade ? gradeOptions.find(o => o.value === String(selectedGrade)) || null : null}
                  onChange={(opt) => {
                    const grade = opt ? Number(opt.value) : null;
                    setSelectedGrade(grade);
                    setSelectedClassroomId(null); // Reset lớp khi đổi khối
                  }}
                  options={gradeOptions}
                  placeholder="Chọn khối..."
                  isSearchable={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <GraduationCap className="w-4 h-4 inline mr-1.5 text-slate-400" />
                  Lớp
                </label>
                <AppSelect
                  value={selectedClassroom}
                  onChange={(opt) => setSelectedClassroomId(opt?.value || null)}
                  options={classroomOptions}
                  placeholder={selectedGrade ? (isLoadingClassrooms ? 'Đang tải...' : 'Chọn lớp...') : 'Chọn khối trước'}
                  isDisabled={!selectedGrade || isLoadingClassrooms}
                  isLoading={isLoadingClassrooms}
                  noOptionsMessage={() => 'Không có lớp nào trong khối này'}
                />
              </div>
            </div>

            <AppButton
              onClick={handleStartExam}
              disabled={!studentName.trim() || !selectedClassroomId || !isTimeValid}
              isLoading={isStarting}
              fullWidth
              size="lg"
              className={!isTimeValid 
                  ? 'bg-slate-200 text-slate-500 border-none'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg border-none'
              }
            >
              {isStarting ? (
                'Đang khởi tạo...'
              ) : isBeforeStart ? (
                countdownText
              ) : isAfterEnd ? (
                'Đã quá thời gian làm bài'
              ) : (
                'Bắt đầu làm bài'
              )}
            </AppButton>
          </div>

          <p className="text-xs text-slate-400 text-center mt-4">
            Sau khi bắt đầu, đồng hồ sẽ đếm ngược. Hết thời gian bài thi sẽ tự động nộp.
          </p>
        </div>
      </div>
    </div>
  );
}
