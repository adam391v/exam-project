import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminResultService, classroomService } from '../../services/data.service';
import { toast } from 'sonner';
import { Search, Trash2, Eye, ClipboardList, ArrowLeft, Users, Clock, Download } from 'lucide-react';
import AppSelect from '../../components/AppSelect';
import AppInput from '../../components/AppInput';
import ConfirmModal from '../../components/ConfirmModal';
import AppButton from '../../components/AppButton';
import * as XLSX from 'xlsx';

// Options khối 1-12
const gradeOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Khối ${i + 1}`,
}));

// Format thời gian làm bài
const formatTimeTaken = (seconds?: number) => {
  if (!seconds && seconds !== 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <span className="font-medium text-slate-600">{day}/{month}/{year}</span>
      <span className="text-[11px] text-slate-400 mt-0.5">lúc {hours}:{minutes}</span>
    </div>
  );
};

export default function ResultsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string; name?: string } | null>(null);
  // Chi tiết lớp
  const [classDetail, setClassDetail] = useState<{ studentClass: string; examId: string; examTitle: string; subjectName: string } | null>(null);

  // Lọc theo lớp
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);

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
  const studentClassParam = selectedClassroom?.label || undefined;

  // API nhóm theo lớp
  const { data, isLoading } = useQuery({
    queryKey: ['admin-results-grouped', page, search, studentClassParam],
    queryFn: () => adminResultService.getAll({ page, limit: 20, search: search || undefined, studentClass: studentClassParam }),
    enabled: !classDetail,
  });

  // API chi tiết 1 lớp + 1 đề thi
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin-results-class', classDetail?.studentClass, classDetail?.examId],
    queryFn: () => adminResultService.getClassDetail(classDetail!.studentClass, classDetail!.examId),
    enabled: !!classDetail,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminResultService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-results'] });
      queryClient.invalidateQueries({ queryKey: ['admin-results-grouped'] });
      queryClient.invalidateQueries({ queryKey: ['admin-results-class'] });
      toast.success('Đã xoá');
    },
  });

  const openDetail = (group: any) => {
    setClassDetail({
      studentClass: group.studentClass,
      examId: group.examId,
      examTitle: group.examTitle,
      subjectName: group.subjectName,
    });
  };

  const exportExcel = () => {
    if (!detailData || !Array.isArray(detailData)) return;

    const exportData = detailData.map((s: any, index: number) => ({
      'STT': index + 1,
      'Họ và tên': s.studentName,
      'Lớp': s.studentClass,
      'Điểm': s.result?.score ?? '-',
      'Đúng / Tổng': s.result ? `${s.result.correctAnswers}/${s.result.totalQuestions}` : '-',
      'Thời gian làm bài': s.result?.timeTaken ? `${Math.floor(s.result.timeTaken / 60)} phút ${s.result.timeTaken % 60} giây` : '-',
      'Số lần chuyển tab': s.tabSwitchCount ?? 0,
      'Thời gian nộp': s.submittedAt ? new Date(s.submittedAt).toLocaleString('vi-VN') : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KetQua');

    const fileName = `Bang_Diem_${classDetail?.studentClass}_${classDetail?.examTitle}.xlsx`.replace(/\s+/g, '_');
    XLSX.writeFile(workbook, fileName);
  };

  // ============ VIEW: Chi tiết lớp ============
  if (classDetail) {
    const students = Array.isArray(detailData) ? detailData : [];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <AppButton variant="ghost" onClick={() => setClassDetail(null)} icon={<ArrowLeft className="w-4 h-4" />} className="text-slate-500 hover:text-blue-600 hover:bg-transparent px-0">
            Quay lại
          </AppButton>

          <AppButton onClick={exportExcel} className="bg-green-600 hover:bg-green-700 focus:ring-green-500" icon={<Download className="w-4 h-4" />}>
            Xuất Excel
          </AppButton>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kết quả lớp {classDetail.studentClass}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Đề thi: <span className="font-medium text-slate-700">{classDetail.examTitle}</span> • Môn: <span className="font-medium text-slate-700">{classDetail.subjectName}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">STT</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Họ tên</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Điểm</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Đúng/Tổng</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Thời gian làm bài</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Thời gian nộp</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingDetail ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">{Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>))}</tr>
                )) : students.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400"><ClipboardList className="w-12 h-12 mx-auto mb-2 text-slate-300" />Chưa có kết quả nào</td></tr>
                ) : students.map((s: any, index: number) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{s.studentName}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold ${(s.result?.score || 0) >= 7 ? 'bg-green-100 text-green-700' :
                          (s.result?.score || 0) >= 5 ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {s.result?.score ?? '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700">
                      {s.result ? `${s.result.correctAnswers}/${s.result.totalQuestions}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatTimeTaken(s.result?.timeTaken)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500">{formatDate(s.submittedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/results/${s.id}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Xem chi tiết"><Eye className="w-4 h-4" /></a>
                        <AppButton variant="danger-ghost" size="icon" onClick={() => setConfirmDelete({ isOpen: true, id: s.id, name: s.studentName })} title="Xoá" icon={<Trash2 className="w-4 h-4" />} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmModal
          isOpen={!!confirmDelete?.isOpen}
          title="Xác nhận xoá kết quả"
          message={`Bạn có chắc chắn muốn xoá bài thi của học sinh "${confirmDelete?.name}"? Hành động này không thể hoàn tác.`}
          onConfirm={() => {
            if (confirmDelete?.id) {
              deleteMutation.mutate(confirmDelete.id);
              setConfirmDelete(null);
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      </div>
    );
  }

  // ============ VIEW: Danh sách nhóm theo lớp ============
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kết quả thi</h1>
        <p className="text-sm text-slate-500 mt-1">Kết quả theo lớp học — click vào để xem chi tiết</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-1 gap-4">
          <div className="w-36">
            <AppSelect
              value={selectedGrade ? gradeOptions.find(o => o.value === String(selectedGrade)) || null : null}
              onChange={(opt) => {
                setSelectedGrade(opt ? Number(opt.value) : null);
                setSelectedClassroomId(null);
                setPage(1);
              }}
              options={gradeOptions}
              placeholder="Chọn khối..."
              isSearchable={false}
            />
          </div>
          <div className="w-48">
            <AppSelect
              value={selectedClassroom}
              onChange={(opt) => {
                setSelectedClassroomId(opt?.value || null);
                setPage(1);
              }}
              options={classroomOptions}
              placeholder={selectedGrade ? (isLoadingClassrooms ? 'Đang tải...' : 'Lọc theo lớp...') : 'Chọn khối trước'}
              isDisabled={!selectedGrade || isLoadingClassrooms}
              isLoading={isLoadingClassrooms}
              noOptionsMessage={() => 'Không có lớp'}
              isClearable
            />
          </div>
        </div>

        <div className="relative max-w-sm flex-1">
          <AppInput
            type="text"
            placeholder="Tìm theo lớp, đề thi, môn..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Lớp</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Đề thi</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Môn thi</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Số học sinh</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Điểm TB</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Ngày thi</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">{Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-6 py-4"><div className="h-4 bg-slate-200 rounded animate-pulse" /></td>))}</tr>
              )) : data?.data?.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400"><ClipboardList className="w-12 h-12 mx-auto mb-2 text-slate-300" />Chưa có kết quả nào</td></tr>
              ) : data?.data?.map((group: any, i: number) => (
                <tr key={`${group.studentClass}-${group.examId}-${i}`}
                  className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                  onClick={() => openDetail(group)}
                >
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                      <Users className="w-4 h-4 text-blue-500" />
                      {group.studentClass}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-800">{group.examTitle}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20">
                      {group.subjectName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-slate-900">{group.studentCount}</span>
                    <span className="text-slate-400 ml-1 text-xs">HS</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold ${group.avgScore >= 7 ? 'bg-green-100 text-green-700' :
                        group.avgScore >= 5 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      {group.avgScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-xs text-slate-500">{formatDate(group.latestDate)}</td>
                  <td className="px-6 py-4 text-right">
                    <AppButton variant="ghost" size="icon" className="hover:text-blue-600 hover:bg-blue-50 pointer-events-none" icon={<Eye className="w-4 h-4" />} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-500">Trang {data.meta.page} / {data.meta.totalPages} ({data.meta.total} nhóm)</p>
            <div className="flex gap-2">
              <AppButton variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Trước</AppButton>
              <AppButton variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= data.meta.totalPages}>Sau</AppButton>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete?.isOpen}
        title="Xác nhận xoá kết quả"
        message={`Bạn có chắc chắn muốn xoá bài thi của học sinh "${confirmDelete?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={() => {
          if (confirmDelete?.id) {
            deleteMutation.mutate(confirmDelete.id);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
