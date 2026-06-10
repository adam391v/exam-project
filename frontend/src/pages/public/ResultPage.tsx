import { useState } from 'react';
import HtmlContent from '../../components/HtmlContent';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resultService } from '../../services/data.service';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  MinusCircle,
  FileText,
  Home,
  Eye,
} from 'lucide-react';
import type { ResultDetail } from '../../types/api.types';

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [showReview, setShowReview] = useState(false);

  const { data: result, isLoading } = useQuery<ResultDetail>({
    queryKey: ['result', sessionId],
    queryFn: () => resultService.getBySession(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-600">Không tìm thấy kết quả</h2>
        <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const { result: examResult, session, exam, review } = result;
  const scorePercent = (examResult.score / 10) * 100;
  const isGoodScore = examResult.score >= 7;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} phút ${s} giây`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Score Card */}
      <div className={`rounded-2xl overflow-hidden shadow-lg ${isGoodScore ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
        <div className="px-6 sm:px-8 py-8 text-center text-white">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Kết Quả Bài Thi</h1>
          <p className="text-white/80 text-sm">{exam.title}</p>
          <div className="mt-6">
            <p className="text-6xl font-extrabold tracking-tight">{examResult.score}</p>
            <p className="text-white/70 text-sm mt-1">trên thang 10 điểm</p>
          </div>
          <div className="mt-4 max-w-xs mx-auto">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-1000 ease-out" style={{ width: `${scorePercent}%` }} />
            </div>
          </div>
          {examResult.isPassed !== null && examResult.isPassed !== undefined && (
            <p className={`mt-3 text-sm font-semibold ${examResult.isPassed ? 'text-green-200' : 'text-red-200'}`}>
              {examResult.isPassed ? '✓ Đạt' : '✗ Chưa đạt'}
            </p>
          )}
        </div>
      </div>

      {/* Student Info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mt-6 p-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-slate-500 mb-0.5">Họ và tên</p><p className="font-semibold text-slate-900">{session.studentName}</p></div>
          <div><p className="text-slate-500 mb-0.5">Lớp</p><p className="font-semibold text-slate-900">{session.studentClass}</p></div>
          <div><p className="text-slate-500 mb-0.5">Môn học</p><p className="font-semibold text-slate-900">{exam.subject.name}</p></div>
          <div><p className="text-slate-500 mb-0.5">Thời gian làm bài</p><p className="font-semibold text-slate-900">{formatDuration(examResult.timeTaken)}</p></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2"><FileText className="w-5 h-5 text-slate-500" /></div>
          <p className="text-xl font-bold text-slate-900">{examResult.totalQuestions}</p><p className="text-xs text-slate-500">Tổng câu</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
          <p className="text-xl font-bold text-green-600">{examResult.correctAnswers}</p><p className="text-xs text-slate-500">Đúng</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-2"><XCircle className="w-5 h-5 text-red-500" /></div>
          <p className="text-xl font-bold text-red-500">{examResult.wrongAnswers}</p><p className="text-xs text-slate-500">Sai</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2"><MinusCircle className="w-5 h-5 text-orange-500" /></div>
          <p className="text-xl font-bold text-orange-500">{examResult.unanswered}</p><p className="text-xs text-slate-500">Bỏ qua</p>
        </div>
      </div>

      {/* Review Section */}
      {review && review.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowReview(!showReview)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
            <Eye className="w-4 h-4" />{showReview ? 'Ẩn đáp án' : 'Xem đáp án chi tiết'}
          </button>
          {showReview && (
            <div className="mt-6 space-y-6">
              {review.map((item, idx) => (
                <div key={idx} className={`bg-white rounded-xl border p-5 ${item.isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${item.isCorrect ? 'bg-green-100 text-green-700' : item.selectedOptionId ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>
                    <HtmlContent html={item.question.content} className="text-sm text-slate-800" />
                  </div>
                  <div className="space-y-2 ml-10">
                    {item.options.map((opt) => {
                      const isSelected = opt.id === item.selectedOptionId;
                      const isCorrectOption = opt.isCorrect;
                      let optionClass = 'flex items-center gap-3 p-2.5 rounded-lg text-sm ';
                      if (isCorrectOption) optionClass += 'bg-green-50 text-green-800 font-medium';
                      else if (isSelected && !isCorrectOption) optionClass += 'bg-red-50 text-red-800';
                      else optionClass += 'text-slate-600';
                      return (
                        <div key={opt.id} className={optionClass}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrectOption ? 'bg-green-200 text-green-800' : isSelected ? 'bg-red-200 text-red-800' : 'bg-slate-100'}`}>{opt.label}</span>
                          <span>{opt.content}</span>
                          {isCorrectOption && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                          {isSelected && !isCorrectOption && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
                        </div>
                      );
                    })}
                  </div>
                  {item.question.explanation && (
                    <div className="mt-3 ml-10 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-1">Giải thích:</p>
                      <HtmlContent html={item.question.explanation} className="text-sm text-blue-800" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 mt-8">
        <Link to="/" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all">
          <Home className="w-4 h-4" /> Về trang chủ
        </Link>
      </div>
    </div>
  );
}
