import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import RichTextEditor from '../../components/RichTextEditor';
import HtmlContent from '../../components/HtmlContent';
import FileUploadInput from '../../components/FileUploadInput';
import AppSelect from '../../components/AppSelect';
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
  Layers,
  Link as LinkIcon,
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import AppModal from '../../components/AppModal';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';

// ===== Interfaces =====
const optionSchema = z.object({ id: z.string().optional(), label: z.string(), content: z.string(), isCorrect: z.boolean(), sortOrder: z.number().optional() });
const questionSchema = z.object({
  content: z.string().min(1, 'Nội dung không được rỗng'), type: z.string(), imageUrl: z.string().optional(), audioUrl: z.string().optional(), youtubeUrl: z.string().optional(), explanation: z.string().optional(),
  options: z.array(optionSchema).optional(), correctAnswers: z.array(z.string()).optional()
}).superRefine((data, ctx) => {
  if (data.type === 'FILL_IN_BLANK') {
    if (!data.correctAnswers || data.correctAnswers.filter(a => a.trim()).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phải nhập ít nhất 1 đáp án đúng', path: ['correctAnswers'] });
    }
  } else {
    if (!data.options || !data.options.some(o => o.isCorrect)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phải chọn ít nhất 1 đáp án đúng', path: ['options'] });
    }
  }
});
const subQuestionSchema = z.object({
  content: z.string().min(1, 'Nội dung không được rỗng'), type: z.string(), explanation: z.string().optional(),
  options: z.array(optionSchema).refine(opts => opts.some(o => o.isCorrect), 'Phải chọn ít nhất 1 đáp án đúng')
});
const groupSchema = z.object({
  title: z.string().optional(), content: z.string().min(1, 'Nội dung chung không được rỗng'), imageUrl: z.string().optional(), audioUrl: z.string().optional(), youtubeUrl: z.string().optional(),
  questions: z.array(subQuestionSchema).min(1, 'Phải có ít nhất 1 câu hỏi con')
});
type QuestionFormValues = z.infer<typeof questionSchema>;
type GroupFormValues = z.infer<typeof groupSchema>;

const defaultOptions = [
  { label: 'A', content: '', isCorrect: false },
  { label: 'B', content: '', isCorrect: false },
  { label: 'C', content: '', isCorrect: false },
  { label: 'D', content: '', isCorrect: false },
];

const defaultForm: QuestionFormValues = {
  content: '', imageUrl: '', audioUrl: '', youtubeUrl: '', explanation: '', type: 'SINGLE_CHOICE',
  options: defaultOptions.map(o => ({ ...o })),
  correctAnswers: [''],
};

const defaultSubQuestion = {
  content: '', explanation: '', type: 'SINGLE_CHOICE',
  options: defaultOptions.map(o => ({ ...o })),
};

const defaultGroupForm: GroupFormValues = {
  title: '', content: '', imageUrl: '', audioUrl: '', youtubeUrl: '',
  questions: [{ ...defaultSubQuestion, options: defaultOptions.map(o => ({ ...o })) }],
};

export default function ExamDetailAdminPage() {
  const { id: examId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string; type: 'question' | 'group' } | null>(null);
  const { control: qControl, handleSubmit: handleQSubmit, reset: resetQ, formState: { errors: qErrors }, watch: watchQ } = useForm<QuestionFormValues>({ resolver: zodResolver(questionSchema), defaultValues: defaultForm });
  const { control: gControl, handleSubmit: handleGSubmit, reset: resetG, formState: { errors: gErrors } } = useForm<GroupFormValues>({ resolver: zodResolver(groupSchema), defaultValues: defaultGroupForm });
  const qType = watchQ('type');

  // Lấy chi tiết đề thi + câu hỏi
  const { data: exam, isLoading } = useQuery({
    queryKey: ['admin-exam-detail', examId],
    queryFn: () => adminExamService.getOne(examId!),
    enabled: !!examId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-exam-detail', examId] });

  // === Mutations: Câu đơn ===
  const addMutation = useMutation({
    mutationFn: (dto: any) => adminExamService.addQuestion(examId!, dto),
    onSuccess: () => { invalidate(); toast.success('Thêm câu hỏi thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ questionId, dto }: { questionId: string; dto: any }) => adminExamService.updateQuestion(examId!, questionId, dto),
    onSuccess: () => { invalidate(); toast.success('Cập nhật thành công'); closeModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => adminExamService.removeQuestion(examId!, questionId),
    onSuccess: () => { invalidate(); toast.success('Đã xoá câu hỏi'); },
  });

  // === Mutations: Câu chùm ===
  const addGroupMutation = useMutation({
    mutationFn: (dto: any) => adminExamService.addQuestionGroup(examId!, dto),
    onSuccess: () => { invalidate(); toast.success('Thêm câu hỏi chùm thành công'); closeGroupModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, dto }: { groupId: string; dto: any }) => adminExamService.updateQuestionGroup(examId!, groupId, dto),
    onSuccess: () => { invalidate(); toast.success('Cập nhật nhóm thành công'); closeGroupModal(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => adminExamService.removeQuestionGroup(examId!, groupId),
    onSuccess: () => { invalidate(); toast.success('Đã xoá nhóm câu hỏi'); },
  });

  const publishMutation = useMutation({
    mutationFn: () => adminExamService.publish(examId!),
    onSuccess: () => { invalidate(); toast.success('Đã công khai đề thi'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => adminExamService.importQuestions(examId!, file),
    onSuccess: (result: any) => {
      invalidate();
      toast.success(`Import thành công ${result.imported} câu hỏi`);
      if (result.failed > 0) toast.warning(`${result.failed} câu bị lỗi`);
      setShowImportModal(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Lỗi import'),
  });

  // === Handlers: Câu đơn ===
  const openCreate = () => {
    setEditingQuestionId(null);
    resetQ({ ...defaultForm, options: defaultOptions.map(o => ({ ...o })) });
    setShowQuestionModal(true);
  };

  const openEdit = (q: any) => {
    setEditingQuestionId(q.id);
    const isFillInBlank = q.type === 'FILL_IN_BLANK';
    resetQ({
      content: q.content, imageUrl: q.imageUrl || '', audioUrl: q.audioUrl || '', youtubeUrl: q.youtubeUrl || '',
      explanation: q.explanation || '', type: q.type,
      options: isFillInBlank ? [] : (q.options?.map((o: any) => ({ label: o.label, content: o.content, isCorrect: o.isCorrect })) || []),
      correctAnswers: isFillInBlank && q.options?.length ? q.options.map((o: any) => o.content) : [''],
    });
    setShowQuestionModal(true);
  };

  const closeModal = () => { setShowQuestionModal(false); setEditingQuestionId(null); };

  const onQuestionSubmit: SubmitHandler<QuestionFormValues> = (values) => {
    if (values.type === 'FILL_IN_BLANK') {
      const answers = values.correctAnswers?.map(a => a.trim()).filter(a => a) || [];
      const dto = { ...values, correctAnswers: answers, options: undefined };
      if (editingQuestionId) { updateMutation.mutate({ questionId: editingQuestionId, dto }); }
      else { addMutation.mutate(dto); }
    } else {
      const dto = { ...values, correctAnswers: undefined };
      if (editingQuestionId) { updateMutation.mutate({ questionId: editingQuestionId, dto }); }
      else { addMutation.mutate(dto); }
    }
  };

  // === Handlers: Câu chùm ===
  const openCreateGroup = () => {
    setEditingGroupId(null);
    resetG({
      title: '', content: '', imageUrl: '', audioUrl: '', youtubeUrl: '',
      questions: [{ ...defaultSubQuestion, options: defaultOptions.map(o => ({ ...o })) }],
    });
    setShowGroupModal(true);
  };

  const openEditGroup = (g: any) => {
    setEditingGroupId(g.id);
    resetG({
      title: g.title || '', content: g.content || '', imageUrl: g.imageUrl || '',
      audioUrl: g.audioUrl || '', youtubeUrl: g.youtubeUrl || '',
      questions: g.questions?.map((q: any) => ({
        content: q.content, explanation: q.explanation || '', type: q.type || 'SINGLE_CHOICE',
        options: q.options?.map((o: any) => ({ label: o.label, content: o.content, isCorrect: o.isCorrect })) || defaultOptions.map(o => ({ ...o })),
      })) || [],
    });
    setShowGroupModal(true);
  };

  const closeGroupModal = () => { setShowGroupModal(false); setEditingGroupId(null); };

  const onGroupSubmit: SubmitHandler<GroupFormValues> = (values) => {
    if (editingGroupId) {
      updateGroupMutation.mutate({ groupId: editingGroupId, dto: values });
    } else {
      addGroupMutation.mutate(values);
    }
  };

  // === Misc ===
  const handleImport = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { toast.error('Chọn file Excel'); return; }
    importMutation.mutate(file);
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Nháp', color: 'bg-slate-100 text-slate-700' },
    PUBLISHED: { label: 'Công khai', color: 'bg-green-100 text-green-700' },
    ARCHIVED: { label: 'Lưu trữ', color: 'bg-orange-100 text-orange-700' },
  };

  // Tính tổng câu hỏi thực tế
  const totalQuestions = (exam?.questions?.length || 0) +
    (exam?.questionGroups?.reduce((sum: number, g: any) => sum + (g.questions?.length || 0), 0) || 0);

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

  // Merge câu đơn + groups theo sortOrder để hiển thị xen kẽ
  const mergedItems: Array<{ type: 'single'; sortOrder: number; data: any; idx: number } | { type: 'group'; sortOrder: number; data: any }> = [];
  let questionIdx = 0;

  (exam.questions || []).forEach((q: any) => {
    mergedItems.push({ type: 'single', sortOrder: q.sortOrder ?? 0, data: q, idx: questionIdx++ });
  });
  (exam.questionGroups || []).forEach((g: any) => {
    mergedItems.push({ type: 'group', sortOrder: g.sortOrder ?? 0, data: g });
  });
  mergedItems.sort((a, b) => a.sortOrder - b.sortOrder);

  // Đánh số câu liên tục
  let globalIdx = 0;
  const numberedItems = mergedItems.map(item => {
    if (item.type === 'single') {
      globalIdx++;
      return { ...item, number: globalIdx };
    } else {
      const startNum = globalIdx + 1;
      const count = item.data.questions?.length || 0;
      globalIdx += count;
      return { ...item, startNumber: startNum, endNumber: globalIdx };
    }
  });

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
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" />{totalQuestions} câu hỏi</span>
            </div>
          </div>
          <AppButton onClick={() => {
            const url = `${window.location.origin}/exams/${exam.id}`;
            navigator.clipboard.writeText(url);
            toast.success('Đã copy link làm bài!');
            if (exam.status === 'DRAFT' && totalQuestions > 0) {
              publishMutation.mutate();
            }
          }} disabled={publishMutation.isPending} className="bg-green-600 hover:bg-green-700 focus:ring-green-500" icon={<LinkIcon className="w-4 h-4" />}>
            Xuất bản
          </AppButton>
        </div>
      </div>

      {/* Questions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Danh sách câu hỏi ({totalQuestions})</h2>
          <div className="flex gap-2">
            <AppButton variant="outline" size="sm" onClick={() => setShowImportModal(true)} icon={<Upload className="w-3.5 h-3.5" />} className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100">
              Import Excel
            </AppButton>
            <AppButton variant="purple" size="sm" onClick={openCreateGroup} icon={<Layers className="w-3.5 h-3.5" />}>
              Thêm câu chùm
            </AppButton>
            <AppButton size="sm" onClick={openCreate} icon={<Plus className="w-3.5 h-3.5" />}>
              Thêm câu hỏi
            </AppButton>
          </div>
        </div>

        {/* Merged List */}
        <div className="divide-y divide-slate-100">
          {numberedItems.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 text-sm mb-1">Chưa có câu hỏi nào</p>
              <p className="text-slate-400 text-xs">Thêm câu hỏi thủ công hoặc import từ Excel</p>
            </div>
          ) : numberedItems.map((item: any, idx: number) => {
            if (item.type === 'single') {
              return renderSingleQuestion(item.data, item.number, idx);
            } else {
              return renderQuestionGroup(item.data, item.startNumber, item.endNumber, idx);
            }
          })}
        </div>
      </div>

      {/* ===== Single Question Modal ===== */}
      {showQuestionModal && renderQuestionModal()}

      {/* ===== Group Modal ===== */}
      {showGroupModal && renderGroupModal()}

      {/* ===== Import Modal ===== */}
      {showImportModal && renderImportModal()}

      <ConfirmModal
        isOpen={!!confirmDelete?.isOpen}
        title={confirmDelete?.type === 'group' ? 'Xác nhận xoá nhóm câu hỏi' : 'Xác nhận xoá câu hỏi'}
        message={confirmDelete?.type === 'group' ? 'Bạn có chắc chắn muốn xoá toàn bộ nhóm câu hỏi này cùng các câu con?' : 'Bạn có chắc chắn muốn xoá câu hỏi này?'}
        onConfirm={() => {
          if (confirmDelete?.id) {
            if (confirmDelete.type === 'group') {
              deleteGroupMutation.mutate(confirmDelete.id);
            } else {
              deleteMutation.mutate(confirmDelete.id);
            }
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );

  // ======================== RENDER HELPERS ========================

  function renderSingleQuestion(q: any, number: number, key: number) {
    const isExpanded = expandedQuestion === q.id;
    const isFillBlank = q.type === 'FILL_IN_BLANK';
    const correctOpts = isFillBlank
      ? q.options?.map((o: any) => o.content).join('; ')
      : q.options?.filter((o: any) => o.isCorrect).map((o: any) => o.label).join(', ');
    return (
      <div key={`single-${key}`} className="group">
        <div className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <GripVertical className="w-4 h-4 text-slate-300" />
            <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{number}</span>
          </div>
          <div className="flex-1 text-sm text-slate-800 line-clamp-1"><HtmlContent html={q.content} className="[&>*]:my-0 inline" /></div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-slate-400 hidden sm:block">{isFillBlank ? 'ĐA' : 'Đáp án'}: <span className="font-semibold text-green-600">{correctOpts}</span></span>
            <span className={`text-xs px-2 py-0.5 rounded ${isFillBlank ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}>{q.type === 'SINGLE_CHOICE' ? 'Một' : q.type === 'FILL_IN_BLANK' ? 'Điền' : 'Nhiều'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
        {isExpanded && (
          <div className="px-6 pb-4 bg-slate-50 border-t border-slate-100">
            <div className="pl-12 pt-3 space-y-2">
              {isFillBlank ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500">Đáp án đúng được chấp nhận:</p>
                  {q.options?.map((opt: any, oidx: number) => (
                    <div key={oidx} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm text-green-800 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{opt.content}</span>
                    </div>
                  ))}
                </div>
              ) : (
                q.options?.map((opt: any) => (
                  <div key={opt.id} className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${opt.isCorrect ? 'bg-green-50 text-green-800 font-medium' : 'text-slate-600'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${opt.isCorrect ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{opt.label}</span>
                    <span className="flex-1">{opt.content}</span>
                    {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                  </div>
                ))
              )}
              {q.explanation && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-0.5">Giải thích:</p>
                  <HtmlContent html={q.explanation} className="text-sm text-blue-800" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <AppButton variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(q); }} icon={<Pencil className="w-3.5 h-3.5" />} className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100">
                  Sửa
                </AppButton>
                <AppButton variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, id: q.id, type: 'question' }); }} icon={<Trash2 className="w-3.5 h-3.5" />} className="border-red-200 text-red-600 bg-red-50 hover:bg-red-100">
                  Xoá
                </AppButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderQuestionGroup(g: any, startNum: number, endNum: number, key: number) {
    const isExpanded = expandedGroup === g.id;
    const subCount = g.questions?.length || 0;
    return (
      <div key={`group-${key}`} className="group">
        <div className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-purple-50/50 transition-colors bg-purple-50/30" onClick={() => setExpandedGroup(isExpanded ? null : g.id)}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <GripVertical className="w-4 h-4 text-purple-300" />
            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg flex items-center gap-1.5 text-xs font-bold">
              <Layers className="w-3.5 h-3.5" />
              {startNum}–{endNum}
            </span>
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-purple-800">{g.title || 'Câu hỏi chùm'}</span>
            <span className="text-xs text-purple-500 ml-2">({subCount} câu con)</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <AppButton variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditGroup(g); }} className="hover:text-purple-600 hover:bg-purple-100" icon={<Pencil className="w-3.5 h-3.5" />} />
            <AppButton variant="danger-ghost" size="icon" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, id: g.id, type: 'group' }); }} icon={<Trash2 className="w-3.5 h-3.5" />} />
            {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
          </div>
        </div>
        {isExpanded && (
          <div className="px-6 pb-4 bg-purple-50/20 border-t border-purple-100">
            <div className="pl-8 pt-3">
              {/* Nội dung chung */}
              <div className="p-4 bg-purple-50 rounded-xl mb-4 border border-purple-100">
                <p className="text-xs text-purple-600 font-semibold mb-2">📖 Nội dung chung:</p>
                <HtmlContent html={g.content} className="text-sm text-slate-800 leading-relaxed" />
                {g.imageUrl && <img src={g.imageUrl} alt="" className="mt-3 max-w-xs rounded-lg border" />}
              </div>
              {/* Câu hỏi con */}
              <div className="space-y-3">
                {g.questions?.map((q: any, qIdx: number) => {
                  const correctOpts = q.options?.filter((o: any) => o.isCorrect).map((o: any) => o.label).join(', ');
                  return (
                    <div key={q.id} className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{startNum + qIdx}</span>
                        <div className="flex-1">
                          <HtmlContent html={q.content} className="text-sm text-slate-800 [&>*]:my-0" />
                          <div className="flex flex-wrap gap-2 mt-2">
                            {q.options?.map((o: any) => (
                              <span key={o.id} className={`text-xs px-2 py-0.5 rounded ${o.isCorrect ? 'bg-green-100 text-green-700 font-semibold' : 'bg-slate-100 text-slate-500'}`}>
                                {o.label}: {o.content}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-slate-400 mt-1 inline-block">Đáp án: <span className="font-semibold text-green-600">{correctOpts}</span></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderQuestionModal() {
    return (
      <AppModal
        isOpen={showQuestionModal}
        onClose={closeModal}
        title={editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
        maxWidth="2xl"
      >
        <form onSubmit={handleQSubmit(onQuestionSubmit)} className="p-6 space-y-4">
            <Controller name="type" control={qControl} render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại câu hỏi</label>
                <AppSelect
                  value={{ value: field.value, label: field.value === 'SINGLE_CHOICE' ? 'Một đáp án' : field.value === 'FILL_IN_BLANK' ? 'Điền đáp án' : 'Nhiều đáp án' }}
                  onChange={(opt) => field.onChange(opt?.value || 'SINGLE_CHOICE')}
                  options={[{ value: 'SINGLE_CHOICE', label: 'Một đáp án' }, { value: 'MULTIPLE_CHOICE', label: 'Nhiều đáp án' }, { value: 'FILL_IN_BLANK', label: 'Điền đáp án' }]}
                  isSearchable={false} placeholder="Chọn loại câu hỏi"
                />
              </div>
            )} />
            <Controller name="content" control={qControl} render={({ field, fieldState }) => (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nội dung câu hỏi *</label>
                <RichTextEditor content={field.value} onChange={field.onChange} placeholder="Nhập nội dung câu hỏi... (hỗ trợ LaTeX: $\frac{a}{b}$)" />
                {fieldState.error && <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>}
              </div>
            )} />
            {/* Media inputs */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">🖼️ Đa phương tiện (không bắt buộc)</p>
              <div className="grid grid-cols-1 gap-3">
                <Controller name="imageUrl" control={qControl} render={({ field }) => (
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Hình ảnh</label><FileUploadInput type="image" value={field.value || ''} onChange={field.onChange} /></div>
                )} />
                <Controller name="audioUrl" control={qControl} render={({ field }) => (
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Audio</label><FileUploadInput type="audio" value={field.value || ''} onChange={field.onChange} /></div>
                )} />
                <Controller name="youtubeUrl" control={qControl} render={({ field }) => (
                  <AppInput label="Link YouTube" type="url" value={field.value || ''} onChange={field.onChange} placeholder="https://youtube.com/..." />
                )} />
              </div>
            </div>
            {/* Đáp án */}
            {qType === 'FILL_IN_BLANK' ? (
              <Controller name="correctAnswers" control={qControl} render={({ field, fieldState }) => (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Đáp án đúng * <span className="text-xs text-slate-400 font-normal">(mỗi ô input tương ứng với 1 chỗ trống cần điền)</span></label>
                  <div className="space-y-3">
                    {(field.value || []).map((ans, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-700">{idx + 1}</span>
                        <input type="text" value={ans} onChange={(e) => { const newAns = [...(field.value || [])]; newAns[idx] = e.target.value; field.onChange(newAns); }} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Đáp án đúng cho ô trống ${idx + 1}...`} />
                        {(field.value || []).length > 1 && <AppButton type="button" variant="danger-ghost" size="icon" onClick={() => field.onChange((field.value || []).filter((_, i) => i !== idx))} icon={<X className="w-4 h-4" />} />}
                      </div>
                    ))}
                    <AppButton type="button" variant="outline" size="sm" onClick={() => field.onChange([...(field.value || []), ''])} icon={<Plus className="w-3.5 h-3.5" />} className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 w-fit">Thêm chỗ trống</AppButton>
                  </div>
                  {fieldState.error && <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>}
                  {qErrors.correctAnswers?.root && <p className="text-xs text-red-500 mt-1">{qErrors.correctAnswers.root.message}</p>}
                </div>
              )} />
            ) : (
              <Controller name="options" control={qControl} render={({ field, fieldState }) => (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Đáp án *</label>
                  <div className="space-y-3">
                    {(field.value || []).map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                          <input type={qType === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'} name="correct" checked={opt.isCorrect} onChange={(e) => { const newOpts = [...(field.value || [])]; newOpts[idx].isCorrect = e.target.checked; if (e.target.checked && qType === 'SINGLE_CHOICE') newOpts.forEach((o, i) => { if (i !== idx) o.isCorrect = false; }); field.onChange(newOpts); }} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                          <span className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-700">{opt.label}</span>
                        </label>
                        <input type="text" value={opt.content} onChange={(e) => { const newOpts = [...(field.value || [])]; newOpts[idx].content = e.target.value; field.onChange(newOpts); }} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Nội dung đáp án ${opt.label}`} />
                      </div>
                    ))}
                  </div>
                  {fieldState.error && <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>}
                  {qErrors.options?.root && <p className="text-xs text-red-500 mt-1">{qErrors.options.root.message}</p>}
                </div>
              )} />
            )}
            <Controller name="explanation" control={qControl} render={({ field }) => (
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Giải thích</label><RichTextEditor content={field.value || ''} onChange={field.onChange} placeholder="Giải thích đáp án (không bắt buộc)" /></div>
            )} />
            <div className="flex gap-3 pt-2">
              <AppButton type="button" variant="secondary" onClick={closeModal} fullWidth>Huỷ</AppButton>
              <AppButton type="submit" isLoading={addMutation.isPending || updateMutation.isPending} fullWidth>{editingQuestionId ? 'Cập nhật' : 'Tạo mới'}</AppButton>
            </div>
          </form>
      </AppModal>
    );
  }

  function renderGroupModal() {
    return (
      <AppModal
        isOpen={showGroupModal}
        onClose={closeGroupModal}
        title={
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            {editingGroupId ? 'Sửa câu hỏi chùm' : 'Thêm câu hỏi chùm'}
          </div>
        }
        maxWidth="4xl"
      >
        <form onSubmit={handleGSubmit(onGroupSubmit)} className="p-6 space-y-5">
            {/* Group Info */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-4">
              <p className="text-sm font-semibold text-purple-800">📖 Thông tin nội dung chung</p>
              <Controller name="title" control={gControl} render={({ field }) => (
                <AppInput label="Tiêu đề nhóm" type="text" value={field.value || ''} onChange={field.onChange} placeholder="VD: Đọc hiểu đoạn văn..." />
              )} />
              <Controller name="content" control={gControl} render={({ field, fieldState }) => (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nội dung chung * (Rich Text + LaTeX)</label>
                  <RichTextEditor content={field.value} onChange={field.onChange} placeholder="Nhập đoạn văn, bài toán, bảng dữ liệu..." />
                  {fieldState.error && <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>}
                </div>
              )} />
              {/* Media inputs cho group */}
              <div className="grid grid-cols-1 gap-3">
                <Controller name="imageUrl" control={gControl} render={({ field }) => (
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Hình ảnh</label><FileUploadInput type="image" value={field.value || ''} onChange={field.onChange} /></div>
                )} />
                <Controller name="audioUrl" control={gControl} render={({ field }) => (
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Audio</label><FileUploadInput type="audio" value={field.value || ''} onChange={field.onChange} /></div>
                )} />
                <Controller name="youtubeUrl" control={gControl} render={({ field }) => (
                  <AppInput label="Link YouTube" type="url" value={field.value || ''} onChange={field.onChange} placeholder="https://youtube.com/..." />
                )} />
              </div>
            </div>

            {/* Sub Questions */}
            <Controller name="questions" control={gControl} render={({ field, fieldState }) => (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Danh sách câu hỏi con ({(field.value || []).length})</p>
                  <AppButton type="button" variant="purple" size="sm" onClick={() => field.onChange([...(field.value || []), { ...defaultSubQuestion, options: defaultOptions.map(o => ({ ...o })) }])} icon={<Plus className="w-3.5 h-3.5" />}>Thêm câu con</AppButton>
                </div>
                {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
                {gErrors.questions?.root && <p className="text-xs text-red-500">{gErrors.questions.root.message}</p>}
                {(field.value || []).map((subQ, qIdx) => (
                  <div key={qIdx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Câu {qIdx + 1}</span>
                      {(field.value || []).length > 1 && (
                        <AppButton type="button" variant="danger-ghost" size="icon" onClick={() => field.onChange((field.value || []).filter((_, i) => i !== qIdx))} className="p-1" icon={<X className="w-4 h-4" />} />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Nội dung câu hỏi *</label>
                      <RichTextEditor content={subQ.content} onChange={(html) => { const qs = [...(field.value || [])]; qs[qIdx].content = html; field.onChange(qs); }} placeholder="Nội dung câu hỏi con..." />
                      {gErrors.questions?.[qIdx]?.content && <p className="text-xs text-red-500 mt-1">{gErrors.questions[qIdx]?.content?.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Đáp án *</label>
                      <div className="space-y-2">
                        {subQ.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                              <input type="radio" name={`sub-correct-${qIdx}`} checked={opt.isCorrect} onChange={() => { const qs = [...(field.value || [])]; qs[qIdx].options.forEach((o, i) => o.isCorrect = i === oIdx); field.onChange(qs); }} className="w-3.5 h-3.5 text-green-600 focus:ring-green-500" />
                              <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">{opt.label}</span>
                            </label>
                            <input type="text" value={opt.content} onChange={(e) => { const qs = [...(field.value || [])]; qs[qIdx].options[oIdx].content = e.target.value; field.onChange(qs); }} className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder={`Đáp án ${opt.label}`} />
                          </div>
                        ))}
                      </div>
                      {gErrors.questions?.[qIdx]?.options && <p className="text-xs text-red-500 mt-1">{gErrors.questions[qIdx]?.options?.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Giải thích</label>
                      <RichTextEditor content={subQ.explanation || ''} onChange={(html) => { const qs = [...(field.value || [])]; qs[qIdx].explanation = html; field.onChange(qs); }} placeholder="Giải thích (tuỳ chọn)" />
                    </div>
                  </div>
                ))}
              </div>
            )} />
            <div className="flex gap-3 pt-2">
              <AppButton type="button" variant="secondary" onClick={closeGroupModal} fullWidth>Huỷ</AppButton>
              <AppButton type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500" isLoading={addGroupMutation.isPending || updateGroupMutation.isPending} fullWidth>
                {editingGroupId ? 'Cập nhật' : 'Tạo nhóm'}
              </AppButton>
            </div>
          </form>
      </AppModal>
    );
  }

  function renderImportModal() {
    return (
      <AppModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import câu hỏi từ Excel"
        maxWidth="md"
      >
        <div className="p-6 space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <p className="text-xs text-blue-700 font-medium">Format câu đơn (7 cột):</p>
              <p className="text-xs text-blue-600">Câu hỏi | A | B | C | D | Đáp án đúng | Giải thích</p>
              <hr className="border-blue-200" />
              <p className="text-xs text-blue-700 font-medium">Format hỗ trợ câu chùm (9 cột):</p>
              <p className="text-xs text-blue-600">Loại | Nội dung chung | Câu hỏi | A | B | C | D | Đáp án | Giải thích</p>
              <p className="text-xs text-blue-500 mt-1">Cột "Loại" = CHÙM → bắt đầu nhóm mới</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">File Excel</label>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
            <div className="flex gap-3 pt-2">
              <AppButton type="button" variant="secondary" onClick={() => setShowImportModal(false)} fullWidth>Huỷ</AppButton>
              <AppButton type="button" onClick={handleImport} isLoading={importMutation.isPending} fullWidth>
                Import
              </AppButton>
            </div>
          </div>
      </AppModal>
    );
  }
}
