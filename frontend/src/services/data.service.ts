import api from './api';
import type { Subject, Exam, ExamSessionStart, SessionStatus, ExamResult, ResultDetail, DashboardOverview, ChartDataPoint, PaginatedResponse, AdminUser } from '../types/api.types';

// ===== PUBLIC SERVICES =====

export const subjectService = {
  getAll: async (): Promise<Subject[]> => {
    const { data } = await api.get('/subjects');
    return data.data;
  },
};

export const examService = {
  getAll: async (subjectId?: string, search?: string): Promise<Exam[]> => {
    const params: Record<string, string> = {};
    if (subjectId) params.subjectId = subjectId;
    if (search) params.search = search;
    const { data } = await api.get('/exams', { params });
    return data.data;
  },

  getOne: async (id: string): Promise<Exam> => {
    const { data } = await api.get(`/exams/${id}`);
    return data.data;
  },
};

export const examSessionService = {
  start: async (examId: string, studentName: string, studentClass: string, classroomId?: string): Promise<ExamSessionStart> => {
    const { data } = await api.post('/exam-sessions/start', { examId, studentName, studentClass, classroomId });
    return data.data;
  },

  saveAnswer: async (sessionId: string, questionId: string, selectedOptionId?: string, isMarked?: boolean, isViewed?: boolean) => {
    const { data } = await api.post(`/exam-sessions/${sessionId}/answer`, {
      questionId, selectedOptionId, isMarked, isViewed,
    });
    return data.data;
  },

  submit: async (sessionId: string): Promise<ExamResult> => {
    const { data } = await api.post(`/exam-sessions/${sessionId}/submit`);
    return data.data;
  },

  getStatus: async (sessionId: string): Promise<SessionStatus> => {
    const { data } = await api.get(`/exam-sessions/${sessionId}/status`);
    return data.data;
  },

  reportViolation: async (sessionId: string): Promise<{ tabSwitchCount: number }> => {
    const { data } = await api.post(`/exam-sessions/${sessionId}/violation`);
    return data.data;
  },
};

export const resultService = {
  getBySession: async (sessionId: string): Promise<ResultDetail> => {
    const { data } = await api.get(`/results/${sessionId}`);
    return data.data;
  },
};

// ===== ADMIN SERVICES =====

export const adminSubjectService = {
  getAll: async (params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<Subject>> => {
    const { data } = await api.get('/admin/subjects', { params });
    return data.data;
  },
  create: async (dto: Partial<Subject>) => {
    const { data } = await api.post('/admin/subjects', dto);
    return data.data;
  },
  update: async (id: string, dto: Partial<Subject>) => {
    const { data } = await api.put(`/admin/subjects/${id}`, dto);
    return data.data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/admin/subjects/${id}`);
    return data.data;
  },
};

export const adminExamService = {
  getAll: async (params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<Exam>> => {
    const { data } = await api.get('/admin/exams', { params });
    return data.data;
  },
  getOne: async (id: string) => {
    const { data } = await api.get(`/admin/exams/${id}`);
    return data.data;
  },
  create: async (dto: Partial<Exam>) => {
    const { data } = await api.post('/admin/exams', dto);
    return data.data;
  },
  update: async (id: string, dto: Partial<Exam>) => {
    const { data } = await api.put(`/admin/exams/${id}`, dto);
    return data.data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/admin/exams/${id}`);
    return data.data;
  },
  publish: async (id: string) => {
    const { data } = await api.post(`/admin/exams/${id}/publish`);
    return data.data;
  },

  // ===== Question CRUD (thuộc Exam) =====
  addQuestion: async (examId: string, dto: any) => {
    const { data } = await api.post(`/admin/exams/${examId}/questions`, dto);
    return data.data;
  },
  updateQuestion: async (examId: string, questionId: string, dto: any) => {
    const { data } = await api.put(`/admin/exams/${examId}/questions/${questionId}`, dto);
    return data.data;
  },
  removeQuestion: async (examId: string, questionId: string) => {
    const { data } = await api.delete(`/admin/exams/${examId}/questions/${questionId}`);
    return data.data;
  },
  importQuestions: async (examId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/admin/exams/${examId}/questions/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  // ===== Question Group CRUD =====
  addQuestionGroup: async (examId: string, dto: any) => {
    const { data } = await api.post(`/admin/exams/${examId}/question-groups`, dto);
    return data.data;
  },
  updateQuestionGroup: async (examId: string, groupId: string, dto: any) => {
    const { data } = await api.put(`/admin/exams/${examId}/question-groups/${groupId}`, dto);
    return data.data;
  },
  removeQuestionGroup: async (examId: string, groupId: string) => {
    const { data } = await api.delete(`/admin/exams/${examId}/question-groups/${groupId}`);
    return data.data;
  },
};

export const adminResultService = {
  getAll: async (params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get('/admin/results', { params });
    return data.data;
  },
  getClassDetail: async (studentClass: string, examId: string) => {
    const { data } = await api.get('/admin/results/class-detail', { params: { studentClass, examId } });
    return data.data;
  },
  getDetail: async (id: string) => {
    const { data } = await api.get(`/admin/results/${id}`);
    return data.data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/admin/results/${id}`);
    return data.data;
  },
};

export const dashboardService = {
  getOverview: async (): Promise<DashboardOverview> => {
    const { data } = await api.get('/admin/dashboard/overview');
    return data.data;
  },
  getChartData: async (type: 'daily' | 'monthly' = 'daily', days = 30): Promise<ChartDataPoint[]> => {
    const { data } = await api.get('/admin/dashboard/chart', { params: { type, days } });
    return data.data;
  },
};

export const adminUserService = {
  getAll: async (params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<AdminUser>> => {
    const { data } = await api.get('/admin/users', { params });
    return data.data;
  },
  create: async (dto: any) => {
    const { data } = await api.post('/admin/users', dto);
    return data.data;
  },
  update: async (id: string, dto: any) => {
    const { data } = await api.put(`/admin/users/${id}`, dto);
    return data.data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data.data;
  },
};

// ===== CLASSROOM SERVICES =====

export const classroomService = {
  getGrades: async (): Promise<{ grade: number; count: number }[]> => {
    const { data } = await api.get('/classrooms/grades');
    return data.data;
  },
  getByGrade: async (grade: number) => {
    const { data } = await api.get('/classrooms', { params: { grade } });
    return data.data;
  },
};

export const adminClassroomService = {
  getAll: async (params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<any>> => {
    const { data } = await api.get('/admin/classrooms', { params });
    return data.data;
  },
  create: async (dto: { name: string; grade: number; sortOrder?: number }) => {
    const { data } = await api.post('/admin/classrooms', dto);
    return data.data;
  },
  update: async (id: string, dto: { name?: string; grade?: number; isActive?: boolean; sortOrder?: number }) => {
    const { data } = await api.put(`/admin/classrooms/${id}`, dto);
    return data.data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/admin/classrooms/${id}`);
    return data.data;
  },
};

// ===== UPLOAD SERVICE =====

export const uploadService = {
  /** Upload file (image hoặc audio) — trả về URL tương đối */
  upload: async (file: File): Promise<{ url: string; filename: string; type: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};
