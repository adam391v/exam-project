import { useState, useRef } from 'react';
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
interface QuestionOption {
  id?: string;
  label: string;
  content: string;
  isCorrect: boolean;
  sortOrder?: number;
}

interface QuestionForm {
  content: string;
  imageUrl: string;
  audioUrl: string;
  youtubeUrl: string;
  explanation: string;
  type: string;
  options: QuestionOption[];
  correctAnswers: string[];
}

interface SubQuestionForm {
  content: string;
  explanation: string;
  type: string;
  options: QuestionOption[];
}

interface GroupForm {
  title: string;
  content: string;
  imageUrl: string;
  audioUrl: string;
  youtubeUrl: string;
  questions: SubQuestionForm[];
}

const defaultOptions: QuestionOption[] = [
  { label: 'A', content: '', isCorrect: false },
  { label: 'B', content: '', isCorrect: false },
  { label: 'C', content: '', isCorrect: false },
  { label: 'D', content: '', isCorrect: false },
];

const defaultForm: QuestionForm = {
  content: '', imageUrl: '', audioUrl: '', youtubeUrl: '', explanation: '', type: 'SINGLE_CHOICE',
  options: defaultOptions.map(o => ({ ...o })),
  correctAnswers: [''],
};

const defaultSubQuestion: SubQuestionForm = {
  content: '', explanation: '', type: 'SINGLE_CHOICE',
  options: defaultOptions.map(o => ({ ...o })),
};

const defaultGroupForm: GroupForm = {
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
  const [form, setForm] = useState<QuestionForm>({ ...defaultForm });
  const [groupForm, setGroupForm] = useState<GroupForm>({ ...defaultGroupForm });

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
    setForm({ ...defaultForm, options: defaultOptions.map(o => ({ ...o })) });
    setShowQuestionModal(true);
  };

  const openEdit = (q: any) => {
    setEditingQuestionId(q.id);
    const isFillInBlank = q.type === 'FILL_IN_BLANK';
    setForm({
      content: q.content, imageUrl: q.imageUrl || '', audioUrl: q.audioUrl || '', youtubeUrl: q.youtubeUrl || '',
      explanation: q.explanation || '', type: q.type,
      options: isFillInBlank ? [] : (q.options?.map((o: any) => ({ label: o.label, content: o.content, isCorrect: o.isCorrect })) || []),
      correctAnswers: isFillInBlank && q.options?.length ? q.options.map((o: any) => o.content) : [''],
    });
    setShowQuestionModal(true);
  };

  const closeModal = () => { setShowQuestionModal(false); setEditingQuestionId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.type === 'FILL_IN_BLANK') {
      const answers = form.correctAnswers.map(a => a.trim()).filter(a => a);
      if (answers.length === 0) { toast.error('Phải nhập ít nhất 1 đáp án đúng'); return; }
      const dto = { ...form, correctAnswers: answers, options: undefined };
      if (editingQuestionId) { updateMutation.mutate({ questionId: editingQuestionId, dto }); }
      else { addMutation.mutate(dto); }
    } else {
      if (!form.options.some((o) => o.isCorrect)) { toast.error('Phải chọn ít nhất 1 đáp án đúng'); return; }
      const dto = { ...form, correctAnswers: undefined };
      if (editingQuestionId) { updateMutation.mutate({ questionId: editingQuestionId, dto }); }
      else { addMutation.mutate(dto); }
    }
  };

  const updateOption = (idx: number, field: string, value: any) => {
    const opts = [...form.options];
    (opts[idx] as any)[field] = value;
    if (field === 'isCorrect' && form.type === 'SINGLE_CHOICE' && value) {
      opts.forEach((o, i) => { if (i !== idx) o.isCorrect = false; });
    }
    setForm({ ...form, options: opts });
  };

  // === Handlers: Câu chùm ===
  const openCreateGroup = () => {
    setEditingGroupId(null);
    setGroupForm({
      title: '', content: '', imageUrl: '', audioUrl: '', youtubeUrl: '',
      questions: [{ ...defaultSubQuestion, options: defaultOptions.map(o => ({ ...o })) }],
    });
    setShowGroupModal(true);
  };

  const openEditGroup = (g: any) => {
    setEditingGroupId(g.id);
    setGroupForm({
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

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.content.trim()) { toast.error('Nội dung chung không được để trống'); return; }
    if (groupForm.questions.length === 0) { toast.error('Phải có ít nhất 1 câu hỏi con'); return; }
    for (let i = 0; i < groupForm.questions.length; i++) {
      if (!groupForm.questions[i].options.some(o => o.isCorrect)) {
        toast.error(`Câu hỏi con ${i + 1}: phải chọn đáp án đúng`); return;
      }
    }
    if (editingGroupId) {
      updateGroupMutation.mutate({ groupId: editingGroupId, dto: groupForm });
    } else {
      addGroupMutation.mutate(groupForm);
    }
  };

  const addSubQuestion = () => {
    setGroupForm({
      ...groupForm,
      questions: [...groupForm.questions, { ...defaultSubQuestion, options: defaultOptions.map(o => ({ ...o })) }],
    });
  };

  const removeSubQuestion = (idx: number) => {
    if (groupForm.questions.length <= 1) return;
    setGroupForm({ ...groupForm, questions: groupForm.questions.filter((_, i) => i !== idx) });
  };

  const updateSubQuestion = (idx: number, field: string, value: any) => {
    const qs = [...groupForm.questions];
    (qs[idx] as any)[field] = value;
    setGroupForm({ ...groupForm, questions: qs });
  };

  const updateSubOption = (qIdx: number, oIdx: number, field: string, value: any) => {
    const qs = [...groupForm.questions];
    const opts = [...qs[qIdx].options];
    (opts[oIdx] as any)[field] = value;
    if (field === 'isCorrect' && qs[qIdx].type === 'SINGLE_CHOICE' && value) {
      opts.forEach((o, i) => { if (i !== oIdx) o.isCorrect = false; });
    }
    qs[qIdx] = { ...qs[qIdx], options: opts };
    setGroupForm({ ...groupForm, questions: qs });
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại câu hỏi</label>
              <AppSelect
                value={{ value: form.type, label: form.type === 'SINGLE_CHOICE' ? 'Một đáp án' : form.type === 'FILL_IN_BLANK' ? 'Điền đáp án' : 'Nhiều đáp án' }}
                onChange={(opt) => opt && setForm({ ...form, type: opt.value })}
                options={[
                  { value: 'SINGLE_CHOICE', label: 'Một đáp án' },
                  { value: 'MULTIPLE_CHOICE', label: 'Nhiều đáp án' },
                  { value: 'FILL_IN_BLANK', label: 'Điền đáp án' },
                ]}
                isSearchable={false}
                placeholder="Chọn loại câu hỏi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nội dung câu hỏi *</label>
              <RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} placeholder="Nhập nội dung câu hỏi... (hỗ trợ LaTeX: $\frac{a}{b}$)" />
            </div>
            {/* Media inputs */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">🖼️ Đa phương tiện (không bắt buộc)</p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hình ảnh</label>
                  <FileUploadInput type="image" value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Audio</label>
                  <FileUploadInput type="audio" value={form.audioUrl} onChange={(url) => setForm({ ...form, audioUrl: url })} />
                </div>
                <AppInput
                  label="Link YouTube"
                  type="url"
                  value={form.youtubeUrl}
                  onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>

            {/* Đáp án: tuỳ theo loại câu hỏi */}
            {form.type === 'FILL_IN_BLANK' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Đáp án đúng * <span className="text-xs text-slate-400 font-normal">(mỗi ô input tương ứng với 1 chỗ trống cần điền)</span></label>
                <div className="space-y-3">
                  {form.correctAnswers.map((ans, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-700">{idx + 1}</span>
                      <input
                        type="text"
                        value={ans}
                        onChange={(e) => {
                          const newAns = [...form.correctAnswers];
                          newAns[idx] = e.target.value;
                          setForm({ ...form, correctAnswers: newAns });
                        }}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Đáp án đúng cho ô trống ${idx + 1}...`}
                      />
                      {form.correctAnswers.length > 1 && (
                        <AppButton type="button" variant="danger-ghost" size="icon" onClick={() => { setForm({ ...form, correctAnswers: form.correctAnswers.filter((_, i) => i !== idx) }); }} icon={<X className="w-4 h-4" />} />
                      )}
                    </div>
                  ))}
                  <AppButton type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, correctAnswers: [...form.correctAnswers, ''] })} icon={<Plus className="w-3.5 h-3.5" />} className="border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 w-fit">
                    Thêm chỗ trống
                  </AppButton>
                </div>
                <p className="text-xs text-slate-400 mt-2">Hệ thống không phân biệt hoa/thường khi chấm. Mỗi ô trống yêu cầu nhập chính xác 1 đáp án (hỗ trợ nhiều ô trống trên 1 câu hỏi).</p>
              </div>
            ) : (
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
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Giải thích</label>
              <RichTextEditor content={form.explanation} onChange={(html) => setForm({ ...form, explanation: html })} placeholder="Giải thích đáp án (không bắt buộc)" />
            </div>
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
        <form onSubmit={handleGroupSubmit} className="p-6 space-y-5">
            {/* Group Info */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-4">
              <p className="text-sm font-semibold text-purple-800">📖 Thông tin nội dung chung</p>
              <AppInput
                label="Tiêu đề nhóm"
                type="text"
                value={groupForm.title}
                onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
                placeholder="VD: Đọc hiểu đoạn văn..."
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nội dung chung * (Rich Text + LaTeX)</label>
                <RichTextEditor content={groupForm.content} onChange={(html) => setGroupForm({ ...groupForm, content: html })} placeholder="Nhập đoạn văn, bài toán, bảng dữ liệu..." />
              </div>
              {/* Media inputs cho group */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hình ảnh</label>
                  <FileUploadInput type="image" value={groupForm.imageUrl} onChange={(url) => setGroupForm({ ...groupForm, imageUrl: url })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Audio</label>
                  <FileUploadInput type="audio" value={groupForm.audioUrl} onChange={(url) => setGroupForm({ ...groupForm, audioUrl: url })} />
                </div>
                <AppInput
                  label="Link YouTube"
                  type="url"
                  value={groupForm.youtubeUrl}
                  onChange={(e) => setGroupForm({ ...groupForm, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>

            {/* Sub Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Danh sách câu hỏi con ({groupForm.questions.length})</p>
                <AppButton type="button" variant="purple" size="sm" onClick={addSubQuestion} icon={<Plus className="w-3.5 h-3.5" />}>
                  Thêm câu con
                </AppButton>
              </div>

              {groupForm.questions.map((subQ, qIdx) => (
                <div key={qIdx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Câu {qIdx + 1}</span>
                    {groupForm.questions.length > 1 && (
                      <AppButton type="button" variant="danger-ghost" size="icon" onClick={() => removeSubQuestion(qIdx)} className="p-1" icon={<X className="w-4 h-4" />} />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nội dung câu hỏi *</label>
                    <RichTextEditor content={subQ.content} onChange={(html) => updateSubQuestion(qIdx, 'content', html)} placeholder="Nội dung câu hỏi con..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Đáp án *</label>
                    <div className="space-y-2">
                      {subQ.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                            <input type="radio" name={`sub-correct-${qIdx}`} checked={opt.isCorrect} onChange={() => updateSubOption(qIdx, oIdx, 'isCorrect', true)}
                              className="w-3.5 h-3.5 text-green-600 focus:ring-green-500" />
                            <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">{opt.label}</span>
                          </label>
                          <input type="text" value={opt.content} onChange={(e) => updateSubOption(qIdx, oIdx, 'content', e.target.value)}
                            className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder={`Đáp án ${opt.label}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giải thích</label>
                    <RichTextEditor content={subQ.explanation} onChange={(html) => updateSubQuestion(qIdx, 'explanation', html)} placeholder="Giải thích (tuỳ chọn)" />
                  </div>
                </div>
              ))}
            </div>

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
