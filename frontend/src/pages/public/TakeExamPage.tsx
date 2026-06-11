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
  Layers,
} from 'lucide-react';
import type { ExamSessionStart, ExamAnswer } from '../../types/api.types';

// ===== Types cho structured items =====
interface SubQuestion {
  id: string;
  content: string;
  imageUrl?: string;
  latex?: string;
  questionType: string;
  options: Array<{ id: string; label: string; content: string; sortOrder: number }>;
}

interface SingleItem {
  type: 'single';
  id: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  youtubeUrl?: string;
  latex?: string;
  questionType: string;
  options: Array<{ id: string; label: string; content: string; sortOrder: number }>;
}

interface GroupItem {
  type: 'group';
  id: string;
  groupContent: string;
  groupTitle?: string;
  groupImageUrl?: string;
  groupAudioUrl?: string;
  groupYoutubeUrl?: string;
  subQuestions: SubQuestion[];
}

type ExamItem = SingleItem | GroupItem;

/** Trích xuất YouTube video ID từ URL */
function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([-\w]{11})/);
  return match ? match[1] : null;
}

/** Chuyển URL tương đối thành tuyệt đối (cho file upload local) */
function resolveUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return `${base}${url}`;
}

/** Render khối đa phương tiện (image, audio, YouTube) */
function MediaBlock({ imageUrl, audioUrl, youtubeUrl }: { imageUrl?: string; audioUrl?: string; youtubeUrl?: string }) {
  const hasMedia = imageUrl || audioUrl || youtubeUrl;
  if (!hasMedia) return null;

  const ytId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;

  return (
    <div className="space-y-3 mb-4">
      {imageUrl && (
        <img src={resolveUrl(imageUrl)} alt="Hình minh họa" className="max-w-lg rounded-xl border border-slate-200" />
      )}
      {audioUrl && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <span className="text-xs font-semibold text-blue-600">🔊 Audio</span>
          <audio controls className="flex-1 h-10">
            <source src={resolveUrl(audioUrl)} />
            Trình duyệt không hỗ trợ audio.
          </audio>
        </div>
      )}
      {ytId && (
        <div className="relative w-full max-w-lg aspect-video rounded-xl overflow-hidden border border-slate-200">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      )}
    </div>
  );
}

// ===== Helpers =====
/** Lấy tất cả question IDs của 1 item (1 cho single, N cho group) */
function getItemQuestionIds(item: ExamItem): string[] {
  if (item.type === 'single') return [item.id];
  return item.subQuestions.map((sq) => sq.id);
}

/** Kiểm tra item đã trả lời hết chưa */
function isItemFullyAnswered(item: ExamItem, answers: Map<string, ExamAnswer>): boolean {
  const ids = getItemQuestionIds(item);
  return ids.every((id) => answers.get(id)?.selectedOptionId);
}

/** Kiểm tra item đã trả lời 1 phần (chỉ áp dụng group) */
function isItemPartiallyAnswered(item: ExamItem, answers: Map<string, ExamAnswer>): boolean {
  if (item.type === 'single') return false;
  const ids = getItemQuestionIds(item);
  const answeredCount = ids.filter((id) => answers.get(id)?.selectedOptionId).length;
  return answeredCount > 0 && answeredCount < ids.length;
}

/** Kiểm tra item đã được đánh dấu chưa */
function isItemMarked(item: ExamItem, answers: Map<string, ExamAnswer>): boolean {
  const ids = getItemQuestionIds(item);
  return ids.some((id) => answers.get(id)?.isMarked);
}

/** Đếm tổng câu hỏi thực tế (cho scoring) */
function countTotalQuestions(items: ExamItem[]): number {
  return items.reduce((sum, item) => {
    if (item.type === 'single') return sum + 1;
    return sum + item.subQuestions.length;
  }, 0);
}

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

      try {
        await examSessionService.saveAnswer(sessionId, questionId, optionId, undefined, true);
      } catch {
        // Silent fail
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

  // Mark tất cả câu trong group là đã xem
  const markItemViewed = useCallback(
    async (item: ExamItem) => {
      if (!sessionId) return;
      const ids = getItemQuestionIds(item);
      for (const qId of ids) {
        const current = answers.get(qId);
        if (current?.isViewed) continue;
        const updated: ExamAnswer = {
          questionId: qId,
          selectedOptionId: current?.selectedOptionId || null,
          isMarked: current?.isMarked || false,
          isViewed: true,
        };
        setAnswers((prev) => new Map(prev).set(qId, updated));
        try {
          await examSessionService.saveAnswer(sessionId, qId, undefined, undefined, true);
        } catch { /* Silent */ }
      }
    },
    [sessionId, answers],
  );

  // Chuyển câu
  const goToItem = useCallback(
    (index: number) => {
      if (!examData) return;
      const item = examData.questions[index];
      if (item) {
        setCurrentIndex(index);
        markItemViewed(item as unknown as ExamItem);
      }
    },
    [examData, markItemViewed],
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
  const items = (examData?.questions || []) as unknown as ExamItem[];
  const totalItems = items.length;
  const totalQuestions = countTotalQuestions(items);
  const answeredCount = Array.from(answers.values()).filter((a) => a.selectedOptionId).length;
  const unansweredCount = totalQuestions - answeredCount;
  const isWarningTime = remainingSeconds > 0 && remainingSeconds < 600;

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

  const currentItem = items[currentIndex] as ExamItem;

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

            {/* ===== Render item ===== */}
            {currentItem?.type === 'single'
              ? renderSingleItem(currentItem as SingleItem)
              : renderGroupItem(currentItem as GroupItem)}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={() => goToItem(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Câu trước
              </button>

              {currentIndex === totalItems - 1 ? (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                  Nộp bài
                </button>
              ) : (
                <button
                  onClick={() => goToItem(currentIndex + 1)}
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

              {/* Item Navigation Grid */}
              <div className="grid grid-cols-5 gap-2">
                {items.map((item, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isFullyAnswered = isItemFullyAnswered(item, answers);
                  const isPartial = isItemPartiallyAnswered(item, answers);
                  const isMarked = isItemMarked(item, answers);
                  const isGroup = item.type === 'group';

                  // Xác định câu đã được xem chưa
                  const ids = getItemQuestionIds(item);
                  const isViewed = ids.some((id) => answers.get(id)?.isViewed);

                  let className = 'w-full aspect-square rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center relative ';

                  if (isFullyAnswered) {
                    className += 'q-answered ';
                  } else if (isPartial) {
                    className += 'bg-emerald-50 border-emerald-300 text-emerald-700 ';
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
                      key={item.id}
                      onClick={() => goToItem(idx)}
                      className={className}
                      title={`Câu ${idx + 1}${isGroup ? ' (chùm)' : ''}`}
                    >
                      {idx + 1}
                      {isGroup && (
                        <Layers className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-purple-500" />
                      )}
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
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Layers className="w-3 h-3 text-purple-500" /> Câu hỏi chùm
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

  // =================== RENDER HELPERS ===================

  /** Render câu hỏi đơn */
  function renderSingleItem(item: SingleItem) {
    const answer = answers.get(item.id);
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Câu {currentIndex + 1}
            <span className="text-slate-400 font-normal"> / {totalItems}</span>
          </h2>
          <button
            onClick={() => handleToggleMark(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              answer?.isMarked
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                : 'bg-slate-100 text-slate-500 hover:bg-yellow-50 hover:text-yellow-600'
            }`}
          >
            <Flag className="w-4 h-4" />
            {answer?.isMarked ? 'Đã đánh dấu' : 'Đánh dấu'}
          </button>
        </div>

        {/* Nội dung */}
        <div className="mb-8">
          <HtmlContent html={item.content} className="text-base text-slate-800 leading-relaxed" />
          <div className="mt-4">
            <MediaBlock imageUrl={item.imageUrl} audioUrl={item.audioUrl} youtubeUrl={item.youtubeUrl} />
          </div>
        </div>

        {/* Đáp án */}
        <div className="space-y-3">
          {item.options.map((option) => {
            const isSelected = answer?.selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleSelectAnswer(item.id, option.id)}
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
      </>
    );
  }

  /** Render câu hỏi chùm (group) */
  function renderGroupItem(item: GroupItem) {
    const isMarked = isItemMarked(item, answers);
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Câu {currentIndex + 1}
              <span className="text-slate-400 font-normal"> / {totalItems}</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700">
              <Layers className="w-3.5 h-3.5" />
              Câu hỏi chùm — {item.subQuestions.length} câu
            </span>
          </div>
          <button
            onClick={() => {
              // Toggle mark cho tất cả câu con
              const newMark = !isMarked;
              item.subQuestions.forEach((sq) => {
                const current = answers.get(sq.id);
                if ((current?.isMarked || false) !== newMark) {
                  handleToggleMark(sq.id);
                }
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isMarked
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                : 'bg-slate-100 text-slate-500 hover:bg-yellow-50 hover:text-yellow-600'
            }`}
          >
            <Flag className="w-4 h-4" />
            {isMarked ? 'Đã đánh dấu' : 'Đánh dấu'}
          </button>
        </div>

        {/* Nội dung chung */}
        <div className="mb-6 p-5 sm:p-6 bg-purple-50/60 rounded-xl border border-purple-100">
          <p className="text-xs font-semibold text-purple-600 mb-3 uppercase tracking-wide">📖 Nội dung chung</p>
          <HtmlContent html={item.groupContent} className="text-sm text-slate-800 leading-relaxed" />
          <div className="mt-3">
            <MediaBlock imageUrl={item.groupImageUrl} audioUrl={item.groupAudioUrl} youtubeUrl={item.groupYoutubeUrl} />
          </div>
        </div>

        {/* Các câu hỏi con */}
        <div className="space-y-5">
          {item.subQuestions.map((sq, sqIdx) => {
            const sqAnswer = answers.get(sq.id);
            return (
              <div key={sq.id} className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200">
                {/* Tiêu đề câu con */}
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {currentIndex + 1}.{sqIdx + 1}
                  </span>
                  <HtmlContent html={sq.content} className="text-sm text-slate-800 leading-relaxed flex-1 [&>*]:my-0" />
                </div>

                {/* Đáp án */}
                <div className="space-y-2 ml-11">
                  {sq.options.map((option) => {
                    const isSelected = sqAnswer?.selectedOptionId === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSelectAnswer(sq.id, option.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-slate-600 border border-slate-300'
                          }`}
                        >
                          {option.label}
                        </span>
                        <span className={`text-sm pt-0.5 ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                          {option.content}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }
}
