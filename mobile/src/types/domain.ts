import type { DifficultyKey, StatusKey, UserRole } from './app';

export interface DemoAccount {
  email: string;
  password: string;
  role: UserRole;
  profileName: string;
}

export interface DashboardModule {
  id: string;
  count?: string;
  subtext?: string;
  gradient: readonly [string, string];
}

export interface ClassSummary {
  id: string;
  name: string;
  subject: string;
  schoolYear: string;
  code: string;
  teacherName?: string;
  studentCount: number;
  assignmentCount?: number;
  pendingAssignments?: number;
}

export interface StudentRecord {
  id: string;
  name: string;
  studentCode: string;
  email: string;
  isActive: boolean;
  joinedAt: string;
}

export interface AssignmentSummary {
  id: string;
  title: string;
  description: string;
  deadline: string;
  classNames: string[];
  submitCount?: number;
  totalStudents?: number;
  submitted?: boolean;
  submitStatus: StatusKey | null;
  gradeStatus: StatusKey | null;
  score: number | null;
  maxScore: number;
  allowLate: boolean;
  latePenaltyPct: number;
}

export interface ExamSummary {
  id: string;
  title: string;
  maxScore: number;
  status?: 'DRAFT' | 'PUBLISHED';
  variantCount: number;
  classNames: string[];
  hasSubmissions: boolean;
  questionCount: number;
}

export interface OmrBatchSummary {
  id: string;
  examTitle: string;
  status: StatusKey;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  progressPercentage: number;
  createdAt: string;
}

export interface RemarkSummary {
  id: string;
  examTitle: string;
  questionNumber: number;
  reason: string;
  status: StatusKey;
  createdAt: string;
  teacherComment?: string;
  studentName?: string;
  studentCode?: string;
}

export interface QuestionSummary {
  id: string;
  content: string;
  subject: string;
  difficulty: DifficultyKey;
  tags: string[];
}

export interface ResultSummary {
  id: string;
  examTitle: string;
  score: number;
  maxScore: number;
  totalCorrect: number;
  totalQuestions: number;
  status: StatusKey;
  createdAt: string;
}

export interface ResultDetailRow {
  questionNumber: number;
  detectedAnswer: string | null;
  finalAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  needsReview: boolean;
  reviewReason?: string;
}

export interface NotificationItem {
  id: string;
  type: 'assignment' | 'result' | 'remark' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export interface ProgressPoint {
  date: string;
  score: number;
  examTitle: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentCode: string | null;
  isActive: boolean;
}
