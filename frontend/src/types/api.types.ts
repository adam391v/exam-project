// ===== API Response Types =====

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ===== User Types =====

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER';

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AdminUser;
}

// ===== Subject Types =====

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  _count?: {
    exams: number;
    questions: number;
  };
}

// ===== Exam Types =====

export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

export interface Exam {
  id: string;
  title: string;
  duration: number;
  totalQuestions: number;
  status: ExamStatus;
  isPublic: boolean;
  showAnswer: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  passingScore?: number;
  description?: string;
  startTime?: string;
  endTime?: string;
  subject: { id: string; name: string; code: string };
  _count?: { examQuestions: number; examSessions: number };
}

export interface QuestionOption {
  id: string;
  label: string;
  content: string;
  isCorrect?: boolean;
  sortOrder: number;
}

export interface Question {
  id: string;
  content: string;
  imageUrl?: string;
  latex?: string;
  explanation?: string;
  type: QuestionType;
  difficulty: number;
  options: QuestionOption[];
  subject?: { id: string; name: string; code: string };
  // Câu hỏi chùm (group) fields
  groupId?: string;
  groupContent?: string;
  groupImageUrl?: string;
  groupTitle?: string;
}

// ===== Exam Session Types =====

export interface ExamSessionStart {
  sessionId: string;
  exam: {
    id: string;
    title: string;
    duration: number;
    totalQuestions: number;
    subject: { id: string; name: string; code: string };
  };
  student: { name: string; class: string };
  questions: Question[];
  startedAt: string;
}

export interface ExamAnswer {
  questionId: string;
  selectedOptionId: string | null;
  textAnswer?: string;
  isMarked: boolean;
  isViewed: boolean;
}

export interface SessionStatus {
  sessionId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT';
  exam: {
    id: string;
    title: string;
    duration: number;
    totalQuestions: number;
    subject: { id: string; name: string; code: string };
  };
  student: { name: string; class: string };
  questions: Question[];
  answers: ExamAnswer[];
  startedAt: string;
  remainingSeconds: number;
  result?: ExamResult;
  autoSubmitted?: boolean;
}

// ===== Result Types =====

export interface ExamResult {
  id: string;
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  score: number;
  timeTaken: number;
  isPassed?: boolean;
}

export interface ResultDetail {
  session: {
    id: string;
    studentName: string;
    studentClass: string;
    startedAt: string;
    submittedAt: string;
  };
  exam: { id: string; title: string; subject: { id: string; name: string } };
  result: ExamResult;
  review?: Array<{
    question: { id: string; content: string; imageUrl?: string; latex?: string; explanation?: string };
    options: QuestionOption[];
    selectedOptionId: string | null;
    isCorrect: boolean;
  }>;
}

// ===== Dashboard Types =====

export interface DashboardOverview {
  totalStudents: number;
  totalExamSessions: number;
  totalSubjects: number;
  totalExams: number;
  totalQuestions: number;
  averageScore: number;
  subjectStats: Array<Subject & { _count: { exams: number; questions: number } }>;
  popularExams: Array<{ id: string; title: string; subject: { name: string }; _count: { examSessions: number } }>;
  recentResults: Array<{
    studentName: string;
    studentClass: string;
    submittedAt: string;
    exam: { title: string };
    result: { score: number; correctAnswers: number; totalQuestions: number };
  }>;
}

export interface ChartDataPoint {
  date: string;
  count: number;
  averageScore: number;
}
