import { useState, useRef } from 'react';
import RichTextEditor from '../../components/RichTextEditor';
import HtmlContent from '../../components/HtmlContent';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminExamService } from '../../services/data.service';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  Clock,
  FileText,
  GripVertical,
} from 'lucide-react';

interface QuestionOption {
  id?: string;
  label: string;
  content: string;
  isCorrect: boolean;
  sortOrder?: number;
}

interface QuestionForm {
  content: string;
  explanation: string;
  type: string;
  options: QuestionOption[];
}

const defaultForm: QuestionForm = {
  content: '', explanation: '', type: 'SINGLE_CHOICE',
  options: [
    { label: 'A', content: '', isCorrect: false },
    { label: 'B', content: '', isCorrect: false },
    { label: 'C', content: '', isCorrect: false },
    { label: 'D', content: '', isCorrect: false },
  ],
};

export default function ExamDetailAdminPage() {
  const { id: examId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>({ ...defaultForm });

  // Lấy chi tiết đề thi + câu hỏi
  const { data: exam, isLoading } = useQuery({
    queryKey: ['admin-exam-detail', examId],
    queryFn: () => adminExamService.getOne(examId!),
    enabled: !!examId,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (dto: any) => adminExamService.addQuestion(examId!, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exam-detail', examId] }); toast.success('Thêm câu hỏi thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ questionId, dto }: { questionId: string; dto: any }) => adminExamService.updateQuestion(examId!, questionId, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exam-detail', examId] }); toast.success('Cập nhật thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => adminExamService.removeQuestion(examId!, questionId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exam-detail', examId] }); toast.success('Đã xoá câu hỏi'); },
  });

  const publishMutation = useMutation({
    mutationFn: () => adminExamService.publish(examId!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exam-detail', examId] }); toast.success('Đã công khai đề thi'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => adminExamService.importQuestions(examId!, file),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-exam-detail', examId] });
      toast.success(`Import thành công ${result.imported} câu hỏi`);
      if (result.failed > 0) toast.warning(`${result.failed} câu bị lỗi`);
      setShowImportModal(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi import'),
  });

  // Handlers
  const openCreate = () => {
    setEditingQuestionId(null);
    setForm({ ...defaultForm, options: defaultForm.options.map(o => ({ ...o })) });
    setShowQuestionModal(true);
  };

  const openEdit = (q: any) => {
    setEditingQuestionId(q.id);
    setForm({
      content: q.content, explanation: q.explanation || '', type: q.type,
      options: q.options?.map((o: any) => ({ label: o.label, content: o.content, isCorrect: o.isCorrect })) || [],
    });
    setShowQuestionModal(true);
  };

  const closeModal = () => { setShowQuestionModal(false); setEditingQuestionId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.options.some((o) => o.isCorrect)) { toast.error('Phải chọn ít nhất 1 đáp án đúng'); return; }
    if (editingQuestionId) { updateMutation.mutate({ questionId: editingQuestionId, dto: form }); }
    else { addMutation.mutate(form); }
  };

  const handleImport = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { toast.error('Chọn file Excel'); return; }
    importMutation.mutate(file);
  };

  const updateOption = (idx: number, field: string, value: any) => {
    const opts = [...form.options];
    (opts[idx] as any)[field] = value;
    if (field === 'isCorrect' && form.type === 'SINGLE_CHOICE' && value) {
      opts.forEach((o, i) => { if (i !== idx) o.isCorrect = false; });
    }
    setForm({ ...form, options: opts });
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Nháp', color: 'bg-slate-100 text-slate-700' },
    PUBLISHED: { label: 'Công khai', color: 'bg-green-100 text-green-700' },
    ARCHIVED: { label: 'Lưu trữ', color: 'bg-orange-100 text-orange-700' },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Không tìm thấy đề thi</p>
        <Link to="/admin/exams" className="text-blue-600 hover:underline mt-2 inline-block">← Quay lại</Link>
      </div>
    );
  }

  const status = statusMap[exam.status] || statusMap.DRAFT;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link to="/admin/exams" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách đề thi
      </Link>

      {/* Exam Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-slate-900">{exam.title}</h1>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
            </div>
            {exam.description && <p className="text-sm text-slate-500 mb-3">{exam.description}</p>}
            <div className="flex items-center gap-5 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{exam.subject?.name}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{exam.duration} phút</span>
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" />{exam.questions?.length || 0} câu hỏi</span>
            </div>
          </div>
          {exam.status !== 'PUBLISHED' && (
            <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || !exam.questions?.length}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 shadow-sm transition-all">
              <Globe className="w-4 h-4" /> Công khai
            </button>
          )}
        </div>
      </div>

      {/* Questions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Danh sách câu hỏi ({exam.questions?.length || 0})</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all">
              <Upload className="w-3.5 h-3.5" /> Import Excel
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all">
              <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
            </button>
          </div>
        </div>

        {/* Question List */}
        <div className="divide-y divide-slate-100">
          {(!exam.questions || exam.questions.length === 0) ? (
            <div className="px-6 py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 text-sm mb-1">Chưa có câu hỏi nào</p>
              <p className="text-slate-400 text-xs">Thêm câu hỏi thủ công hoặc import từ Excel</p>
            </div>
          ) : exam.questions.map((q: any, idx: number) => {
            const isExpanded = expandedQuestion === q.id;
            const correctOpts = q.options?.filter((o: any) => o.isCorrect).map((o: any) => o.label).join(', ');
            return (
              <div key={q.id} className="group">
                {/* Question Header */}
                <div className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 text-sm text-slate-800 line-clamp-1"><HtmlContent html={q.content} className="[&>*]:my-0 inline" /></div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:block">Đáp án: <span className="font-semibold text-green-600">{correctOpts}</span></span>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{q.type === 'SINGLE_CHOICE' ? 'Một' : 'Nhiều'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-6 pb-4 bg-slate-50 border-t border-slate-100">
                    <div className="pl-12 pt-3 space-y-2">
                      {q.options?.map((opt: any) => (
                        <div key={opt.id} className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${opt.isCorrect ? 'bg-green-50 text-green-800 font-medium' : 'text-slate-600'}`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${opt.isCorrect ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{opt.label}</span>
                          <span className="flex-1">{opt.content}</span>
                          {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                        </div>
                      ))}
                      {q.explanation && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-600 font-medium mb-0.5">Giải thích:</p>
                          <HtmlContent html={q.explanation} className="text-sm text-blue-800" />
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(q); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all">
                          <Pencil className="w-3.5 h-3.5" /> Sửa
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Xoá câu hỏi này?')) deleteMutation.mutate(q.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all">
                          <Trash2 className="w-3.5 h-3.5" /> Xoá
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Question Create/Edit Modal ===== */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">{editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại câu hỏi</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="SINGLE_CHOICE">Một đáp án</option>
                  <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nội dung câu hỏi *</label>
                <RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} placeholder="Nhập nội dung câu hỏi... (hỗ trợ LaTeX: $\frac{a}{b}$)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Đáp án *</label>
                <div className="space-y-3">
                  {form.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                        <input type={form.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'} name="correct" checked={opt.isCorrect} onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)}
                          className="w-4 h-4 text-green-600 focus:ring-green-500" />
                        <span className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-700">{opt.label}</span>
                      </label>
                      <input type="text" value={opt.content} onChange={(e) => updateOption(idx, 'content', e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Nội dung đáp án ${opt.label}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Giải thích</label>
                <RichTextEditor content={form.explanation} onChange={(html) => setForm({ ...form, explanation: html })} placeholder="Giải thích đáp án (không bắt buộc)" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Huỷ</button>
                <button type="submit" disabled={addMutation.isPending || updateMutation.isPending} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all">{editingQuestionId ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Import Modal ===== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Import câu hỏi từ Excel</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-700 font-medium mb-1">Cấu trúc file Excel:</p>
                <p className="text-xs text-blue-600">Câu hỏi | A | B | C | D | Đáp án đúng | Giải thích</p>
                <p className="text-xs text-blue-500 mt-1">Hàng 1 là header. Đáp án đúng: A, B, C, D (hoặc AB, AC...)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">File Excel</label>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowImportModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Huỷ</button>
                <button onClick={handleImport} disabled={importMutation.isPending} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all">
                  {importMutation.isPending ? 'Đang import...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
