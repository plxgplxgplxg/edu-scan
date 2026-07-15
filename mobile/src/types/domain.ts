import type { StatusKey, UserRole } from './app';

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

export interface AttachmentMetadata {
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
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
  attachments?: AttachmentMetadata[];
  submittedAt?: string | null;
  submittedNote?: string | null;
  submittedAttachments?: AttachmentMetadata[];
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

export interface OmrSubmissionDetail {
  questionNumber: number;
  correctAnswer: string | null;
  detectedAnswer: string | null;
  finalAnswer: string | null;
  isCorrect: boolean;
  needsReview: boolean;
  reviewReason?: string;
}

export interface OmrSubmissionSummary {
  id: string;
  studentId: string | null;
  studentCode: string | null;
  studentName: string | null;
  detectedTestId: string | null;
  resolvedTestCode: string | null;
  resolvedVariantId: string | null;
  testCodeResolutionStatus: string;
  imageUrl: string | null;
  processedImageUrl: string | null;
  annotatedImageUrl: string | null;
  warpOverlayUrl: string | null;
  answerScoresUrl: string | null;
  status: StatusKey;
  score: number;
  maxScore: number;
  correctCount: number;
  wrongCount: number;
  reviewCount: number;
  needsReview: boolean;
  details: OmrSubmissionDetail[];
}

export interface OmrBatchDetail extends OmrBatchSummary {
  examId: string;
  teacherId: string;
  processedFiles: number;
  completedAt?: string | null;
  matchedCount: number;
  unmatchedCount: number;
  submissions: OmrSubmissionSummary[];
}

export interface NotificationItem {
  id: string;
  type: 'assignment' | 'result' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
  routeIntent?:
    | { route: 'StudentClassDetail'; classId: string; assignmentId?: string; mode?: 'submit' | 'readonly' }
    | { route: 'TeacherClassDetail'; classId: string; assignmentId?: string }
    | { route: 'TeacherOmrBatchDetail'; batchId: string }
    | { route: 'TeacherOmrExamDetail'; examId: string }
    | { route: 'SharedNotifications' }
    | { route: 'StudentDashboard' };
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentCode: string | null;
  isActive: boolean;
}
