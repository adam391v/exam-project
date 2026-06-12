import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { subjectService, examService } from '../../services/data.service';
import { Search, Clock, FileText, Users, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import type { Subject, Exam } from '../../types/api.types';

export default function HomePage() {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectService.getAll,
  });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams', selectedSubject, searchQuery],
    queryFn: () => examService.getAll(selectedSubject || undefined, searchQuery || undefined),
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-white/90 font-medium">Miễn phí • Không cần đăng nhập</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Hệ Thống Thi Trắc Nghiệm
              <span className="block text-orange-400">Trực Tuyến</span>
            </h1>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8">
              Ôn luyện và kiểm tra kiến thức mọi lúc, mọi nơi. Chọn đề thi, nhập tên và bắt đầu làm bài ngay!
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto">
              <AppInput
                type="text"
                placeholder="Tìm kiếm đề thi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-5 h-5 text-slate-400" />}
                className="py-3.5 rounded-2xl shadow-xl focus:ring-4 focus:ring-blue-300/50"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Subject Filter */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Môn học</h2>
          <div className="flex flex-wrap gap-3">
            <AppButton
              onClick={() => setSelectedSubject('')}
              variant={!selectedSubject ? 'primary' : 'outline'}
              className={!selectedSubject ? '' : 'bg-white hover:text-blue-600 border-slate-200 hover:border-blue-300'}
            >
              Tất cả
            </AppButton>
            {subjects.map((subject: Subject) => (
              <AppButton
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                variant={selectedSubject === subject.id ? 'primary' : 'outline'}
                className={selectedSubject === subject.id ? '' : 'bg-white hover:text-blue-600 border-slate-200 hover:border-blue-300'}
              >
                {subject.name}
                {subject._count && (
                  <span className="ml-1.5 text-xs opacity-70">({subject._count.exams})</span>
                )}
              </AppButton>
            ))}
          </div>
        </section>

        {/* Exam List */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Đề thi{' '}
            <span className="text-sm font-normal text-slate-500">
              ({exams.length} đề)
            </span>
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                  <div className="h-6 bg-slate-200 rounded w-2/3 mb-4" />
                  <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-1">Chưa có đề thi nào</h3>
              <p className="text-sm text-slate-400">Hãy thử chọn môn học khác hoặc thay đổi từ khoá tìm kiếm</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam: Exam) => (
                <Link
                  key={exam.id}
                  to={`/exams/${exam.id}`}
                  className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {exam.subject?.name}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {exam.title}
                  </h3>

                  {exam.description && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{exam.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {exam.duration} phút
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {exam.totalQuestions} câu
                    </span>
                    {exam._count && (
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        {exam._count.examSessions} lượt
                      </span>
                    )}
                  </div>

                  <div className="flex items-center text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
                    Vào thi
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
