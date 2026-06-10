import { useState, useEffect, useCallback, useRef } from 'react';
import HtmlContent from '../../components/HtmlContent';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { examSessionService } from '../../services/data.service';
import { toast } from 'sonner';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  BookOpen,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import type { ExamSessionStart, ExamAnswer } from '../../types/api.types';

export default function TakeExamPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // State
  const [examData, setExamData] = useState<ExamSessionStart | null>(location.state || null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, ExamAnswer>>(new Map());
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!location.state);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Khôi phục session khi refresh
  useEffect(() => {
    if (!examData && sessionId) {
      setIsLoading(true);
      examSessionService.getStatus(sessionId).then((status) => {
        if (status.status !== 'IN_PROGRESS') {
          navigate(`/results/${sessionId}`);
          return;
        }
        setExamData({
          sessionId: status.sessionId,
          exam: status.exam,
          student: status.student,
          questions: status.questions,
          startedAt: status.startedAt,
        });
        setRemainingSeconds(status.remainingSeconds);

        // Khôi phục answers
        const restoredAnswers = new Map<string, ExamAnswer>();
        status.answers.forEach((a) => {
          restoredAnswers.set(a.questionId, a);
        });
        setAnswers(restoredAnswers);
        setIsLoading(false);
      }).catch(() => {
        toast.error('Không thể khôi phục phiên thi');
        navigate('/');
      });
    }
  }, [sessionId, examData, navigate]);

  // Tính thời gian ban đầu
  useEffect(() => {
    if (examData && remainingSeconds === 0) {
      const elapsed = Math.floor(
        (Date.now() - new Date(examData.startedAt).getTime()) / 1000,
      );
      const duration = examData.exam.duration * 60;
      setRemainingSeconds(Math.max(0, duration - elapsed));
    }
  }, [examData, remainingSeconds]);

  // Countdown Timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds > 0]);

  // Auto-save mỗi 5 giây
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      // Auto-save trigger (answers đã được save khi chọn)
    }, 5000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, []);

  const handleAutoSubmit = useCallback(async () => {
    if (!sessionId) return;
    try {
      await examSessionService.submit(sessionId);
      toast.info('Hết giờ! Bài thi đã được tự động nộp.');
      navigate(`/results/${sessionId}`);
    } catch {
      navigate(`/results/${sessionId}`);
    }
  }, [sessionId, navigate]);

  // Chọn đáp án
  const handleSelectAnswer = useCallback(
    async (questionId: string, optionId: string) => {
      if (!sessionId) return;

      const current = answers.get(questionId) || {
        questionId,
        selectedOptionId: null,
        isMarked: false,
        isViewed: true,
      };

      const updated: ExamAnswer = {
        ...current,
        selectedOptionId: optionId,
        isViewed: true,
      };

      setAnswers((prev) => new Map(prev).set(questionId, updated));

      // Save to backend
      try {
        await examSessionService.saveAnswer(sessionId, questionId, optionId, undefined, true);
      } catch {
        // Silent fail — sẽ retry qua auto-save
      }
    },
    [sessionId, answers],
  );

  // Đánh dấu xem lại
  const handleToggleMark = useCallback(
    async (questionId: string) => {
      if (!sessionId) return;

      const current = answers.get(questionId) || {
        questionId,
        selectedOptionId: null,
        isMarked: false,
        isViewed: true,
      };

      const updated: ExamAnswer = {
        ...current,
        isMarked: !current.isMarked,
        isViewed: true,
      };

      setAnswers((prev) => new Map(prev).set(questionId, updated));

      try {
        await examSessionService.saveAnswer(sessionId, questionId, undefined, updated.isMarked, true);
      } catch {
        // Silent
      }
    },
    [sessionId, answers],
  );

  // Mark câu hỏi là đã xem
  const markViewed = useCallback(
    async (questionId: string) => {
      if (!sessionId) return;
      const current = answers.get(questionId);
      if (current?.isViewed) return;

      const updated: ExamAnswer = {
        questionId,
        selectedOptionId: current?.selectedOptionId || null,
        isMarked: current?.isMarked || false,
        isViewed: true,
      };

      setAnswers((prev) => new Map(prev).set(questionId, updated));

      try {
        await examSessionService.saveAnswer(sessionId, questionId, undefined, undefined, true);
      } catch {
        // Silent
      }
    },
    [sessionId, answers],
  );

  // Chuyển câu
  const goToQuestion = useCallback(
    (index: number) => {
      if (!examData) return;
      const q = examData.questions[index];
      if (q) {
        setCurrentIndex(index);
        markViewed(q.id);
      }
    },
    [examData, markViewed],
  );

  // Nộp bài
  const handleSubmit = async () => {
    if (!sessionId) return;
    setIsSubmitting(true);
    try {
      await examSessionService.submit(sessionId);
      toast.success('Nộp bài thành công!');
      navigate(`/results/${sessionId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi nộp bài');
    } finally {
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Stats
  const totalQuestions = examData?.questions.length || 0;
  const answeredCount = Array.from(answers.values()).filter((a) => a.selectedOptionId).length;
  const unansweredCount = totalQuestions - answeredCount;
  const isWarningTime = remainingSeconds > 0 && remainingSeconds < 600; // < 10 phút

  if (isLoading || !examData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Đang tải bài thi...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = examData.questions[currentIndex];
  const currentAnswer = answers.get(currentQuestion?.id);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-semibold text-slate-900 line-clamp-1">{examData.exam.title}</h1>
              <p className="text-[11px] text-slate-500">
                {examData.student.name} • {examData.student.class}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
                isWarningTime
                  ? 'bg-red-50 text-red-600 animate-pulse-warning'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              {formatTime(remainingSeconds)}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 py-6 flex gap-6">
        {/* Cột trái — Câu hỏi */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 animate-fade-in">
            {/* Câu số */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Câu {currentIndex + 1}
                <span className="text-slate-400 font-normal"> / {totalQuestions}</span>
              </h2>
              <button
                onClick={() => handleToggleMark(currentQuestion.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentAnswer?.isMarked
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                    : 'bg-slate-100 text-slate-500 hover:bg-yellow-50 hover:text-yellow-600'
                }`}
              >
                <Flag className="w-4 h-4" />
                {currentAnswer?.isMarked ? 'Đã đánh dấu' : 'Đánh dấu'}
              </button>
            </div>

            {/* Nội dung câu hỏi */}
            <div className="mb-8">
              <HtmlContent html={currentQuestion.content} className="text-base text-slate-800 leading-relaxed" />
              {currentQuestion.imageUrl && (
                <img
                  src={currentQuestion.imageUrl}
                  alt="Hình minh họa"
                  className="mt-4 max-w-md rounded-xl border border-slate-200"
                />
              )}
            </div>

            {/* Đáp án */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = currentAnswer?.selectedOptionId === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectAnswer(currentQuestion.id, option.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className={`text-sm pt-1 ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                      {option.content}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Câu trước
              </button>

              {currentIndex === totalQuestions - 1 ? (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                  Nộp bài
                </button>
              ) : (
                <button
                  onClick={() => goToQuestion(currentIndex + 1)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all"
                >
                  Câu tiếp
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải — Sidebar sticky */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            {/* Timer */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">Thời gian còn lại</p>
                <p
                  className={`text-3xl font-mono font-bold ${
                    isWarningTime ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {formatTime(remainingSeconds)}
                </p>
                {isWarningTime && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium">Sắp hết giờ!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="grid grid-cols-3 gap-3 text-center mb-5">
                <div>
                  <p className="text-lg font-bold text-slate-900">{totalQuestions}</p>
                  <p className="text-[11px] text-slate-500">Tổng câu</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{answeredCount}</p>
                  <p className="text-[11px] text-slate-500">Đã làm</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-orange-500">{unansweredCount}</p>
                  <p className="text-[11px] text-slate-500">Chưa làm</p>
                </div>
              </div>

              {/* Question Navigation Grid */}
              <div className="grid grid-cols-5 gap-2">
                {examData.questions.map((q, idx) => {
                  const answer = answers.get(q.id);
                  const isCurrent = idx === currentIndex;
                  const isAnswered = !!answer?.selectedOptionId;
                  const isViewed = !!answer?.isViewed;
                  const isMarked = !!answer?.isMarked;

                  let className = 'w-full aspect-square rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center relative ';

                  if (isAnswered) {
                    className += 'q-answered ';
                  } else if (isViewed) {
                    className += 'q-viewed ';
                  } else {
                    className += 'q-unviewed ';
                  }

                  if (isCurrent) {
                    className += 'q-current ';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(idx)}
                      className={className}
                      title={`Câu ${idx + 1}`}
                    >
                      {idx + 1}
                      {isMarked && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-3 h-3 rounded bg-green-500" /> Đã trả lời
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-3 h-3 rounded bg-orange-400" /> Đã xem, chưa trả lời
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-3 h-3 rounded bg-slate-200" /> Chưa xem
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all"
            >
              <Send className="w-4 h-4" />
              Nộp bài
            </button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Xác nhận nộp bài</h3>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tổng số câu</span>
                  <span className="font-semibold text-slate-900">{totalQuestions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Đã làm</span>
                  <span className="font-semibold text-green-600">{answeredCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Chưa làm</span>
                  <span className="font-semibold text-orange-500">{unansweredCount}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Thời gian còn lại</span>
                  <span className="font-semibold text-slate-900">{formatTime(remainingSeconds)}</span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Bạn còn <strong>{unansweredCount} câu</strong> chưa trả lời. Bạn có chắc muốn nộp bài?
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Xác nhận nộp bài
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
