import type {
  AssignmentSummary,
  ClassSummary,
  NotificationItem,
  OmrBatchSummary,
  ProgressPoint,
  QuestionSummary,
  RemarkSummary,
  ResultDetailRow,
  ResultSummary,
  StudentRecord,
  UserSummary,
} from '../types/domain';
import type { DifficultyKey, UserRole } from '../types/app';
import { requestJson } from './http';

type Role = UserRole;

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  name: string;
  studentCode: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

type ClassApi = {
  id: string;
  name: string;
  subject: string;
  schoolYear: string;
  code: string;
  teacherId: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  enrollments: Array<{
    joinedAt: string;
    student: {
      id: string;
      name: string;
      email: string;
      studentCode: string | null;
      isActive: boolean;
    };
  }>;
};

type AssignmentApi = {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  allowLate: boolean;
  latePenaltyPct: number;
  maxScore: number;
  teacherId: string;
  classes: Array<{ classId: string }>;
  _count?: { submits: number };
  submits?: Array<{
    id: string;
    submitStatus: 'ON_TIME' | 'LATE';
    gradeStatus: 'PENDING' | 'GRADED';
    score: number | null;
  }>;
};

type AssignmentSubmitApi = {
  id: string;
  assignmentId: string;
  studentId: string;
  fileUrl: string;
  submitStatus: 'ON_TIME' | 'LATE';
  gradeStatus: 'PENDING' | 'GRADED';
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  updatedAt: string;
  student?: {
    id: string;
    name: string;
    email: string;
    studentCode: string | null;
  };
};

type ExamApi = {
  id: string;
  title: string;
  maxScore: number;
  classes: Array<{
    id: string;
    name: string;
    subject: string;
    schoolYear: string;
    code: string;
  }>;
  variants: Array<{
    id: string;
    testCode: string;
    answerKeys: Array<{
      questionNumber: number;
      correctAnswer: 'A' | 'B' | 'C' | 'D';
    }>;
  }>;
  questionMap: Array<{
    questionNumber: number;
    questionId: string | null;
    question?: {
      id: string;
      content: string;
      subject: string;
      difficulty: DifficultyKey;
    } | null;
  }>;
};

type QuestionListApi = {
  items: Array<{
    id: string;
    content: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    subject: string;
    difficulty: DifficultyKey;
    tags: string[];
  }>;
  total: number;
};

type QuestionApi = QuestionListApi['items'][number];

type RemarkApi = {
  id: string;
  submissionDetailId: string;
  studentId: string;
  reviewerId: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  teacherComment: string | null;
  createdAt: string;
  submissionDetail?: {
    id: string;
    questionNumber: number;
    detectedAnswer: string | null;
    finalAnswer: string | null;
    needsReview: boolean;
    reviewReason: string | null;
    submission?: {
      student: {
        name: string;
        studentCode: string | null;
      } | null;
      exam: {
        title: string;
      };
    };
  };
};

type SubmissionListApi = {
  items: Array<{
    id: string;
    examId: string;
    examTitle: string;
    status: 'GRADED' | 'NEEDS_REVIEW' | 'FAILED';
    createdAt: string;
    reviewedAt: string | null;
    score: number;
    maxScore: number;
    totalCorrect: number;
    totalQuestions: number;
    needsReview: boolean;
    reviewNote: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type SubmissionDetailApi = {
  id: string;
  examId: string;
  status: 'GRADED' | 'NEEDS_REVIEW' | 'FAILED';
  createdAt: string;
  score: {
    totalCorrect: number;
    maxScore: number;
    calculatedScore: number;
  };
  exam: {
    id: string;
    title: string;
    maxScore: number;
  };
  details: Array<{
    id: string;
    questionNumber: number;
    detectedAnswer: string | null;
    finalAnswer: 'A' | 'B' | 'C' | 'D' | null;
    correctAnswer: 'A' | 'B' | 'C' | 'D' | null;
    isCorrect: boolean;
    needsReview: boolean;
    reviewReason: string | null;
  }>;
};

type ProgressApi = Array<{
  date: string;
  score: number;
  maxScore: number;
  examId: string;
  examTitle: string;
  submissionId: string;
  status: 'GRADED' | 'NEEDS_REVIEW' | 'FAILED';
  needsReview: boolean;
  reviewNote: string | null;
}>;

type UserApi = {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentCode: string | null;
  isActive: boolean;
};

type OmrBatchApi = {
  id: string;
  examId: string;
  examTitle: string;
  teacherId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILED' | 'FAILED';
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  failedCount: number;
  progressPercentage: number;
  createdAt: string;
};

export type ClassDetailView = {
  id: string;
  name: string;
  subject: string;
  schoolYear: string;
  code: string;
  teacherName: string;
  studentCount: number;
  students: StudentRecord[];
};

export type TeacherExamView = {
  id: string;
  title: string;
  maxScore: number;
  variantCount: number;
  classNames: string[];
  hasSubmissions: boolean;
  questionCount: number;
};

export type TeacherQuestionDetailView = {
  id: string;
  content: string;
  subject: string;
  difficulty: DifficultyKey;
  tags: string[];
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
};

export async function login(email: string, password: string) {
  return requestJson<AuthSession>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function listClasses(token: string) {
  return requestJson<ClassApi[]>('/classes', { token });
}

export async function getClassDetail(token: string, classId: string) {
  return requestJson<ClassApi>(`/classes/${classId}`, { token });
}

export async function createClass(
  token: string,
  payload: { name: string; subject: string; schoolYear: string },
) {
  return requestJson<ClassApi>('/classes', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function addStudentToClass(
  token: string,
  classId: string,
  payload: { email?: string; studentCode?: string; studentId?: string },
) {
  return requestJson<ClassApi>(`/classes/${classId}/students`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function removeStudentFromClass(
  token: string,
  classId: string,
  studentId: string,
) {
  return requestJson<ClassApi>(`/classes/${classId}/students/${studentId}`, {
    method: 'DELETE',
    token,
  });
}

export async function joinClassByCode(token: string, code: string) {
  return requestJson<ClassApi>(`/classes/join/${encodeURIComponent(code)}`, {
    method: 'POST',
    token,
  });
}

export async function listAssignments(token: string) {
  return requestJson<AssignmentApi[]>('/assignments', { token });
}

export async function getAssignmentSubmits(token: string, assignmentId: string) {
  return requestJson<AssignmentSubmitApi[]>(`/assignments/${assignmentId}/submits`, {
    token,
  });
}

export async function createAssignment(
  token: string,
  payload: {
    title: string;
    description?: string;
    deadline: string;
    allowLate?: boolean;
    latePenaltyPct?: number;
    maxScore?: number;
    classIds: string[];
  },
) {
  return requestJson<AssignmentApi>('/assignments', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function submitAssignment(
  token: string,
  assignmentId: string,
  payload: {
    uri: string;
    name: string;
    type?: string;
  } | string,
) {
  if (typeof payload === 'string') {
    return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
      method: 'POST',
      token,
      body: { fileUrl: payload },
    });
  }

  const formData = new FormData();
  formData.append('file', {
    uri: payload.uri,
    name: payload.name,
    type: payload.type || 'application/octet-stream',
  } as unknown as Blob);

  return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
    method: 'POST',
    token,
    body: formData,
  });
}

export async function listExams(token: string) {
  return requestJson<ExamApi[]>('/exams/my', { token });
}

export async function createExam(
  token: string,
  payload: {
    title: string;
    maxScore: number;
    classIds: string[];
    answerKeys: Array<{
      questionNumber: number;
      correctAnswer: 'A' | 'B' | 'C' | 'D';
    }>;
  },
) {
  return requestJson<ExamApi>('/exams', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function listQuestions(token: string, keyword?: string) {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  return requestJson<QuestionListApi>(`/questions${query}`, { token });
}

export async function createQuestion(
  token: string,
  payload: {
    content: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    subject: string;
    difficulty: DifficultyKey;
    tags?: string[];
  },
) {
  return requestJson<QuestionApi>('/questions', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function listTeacherRemarks(token: string) {
  return requestJson<RemarkApi[]>('/remarks', { token });
}

export async function listStudentRemarks(token: string) {
  return requestJson<RemarkApi[]>('/remarks/me', { token });
}

export async function reviewRemark(
  token: string,
  remarkId: string,
  payload: {
    status: 'APPROVED' | 'REJECTED';
    finalAnswer?: 'A' | 'B' | 'C' | 'D';
    teacherComment?: string;
  },
) {
  return requestJson<RemarkApi>(`/remarks/${remarkId}/review`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export async function createRemark(
  token: string,
  payload: { submissionDetailId: string; reason: string },
) {
  return requestJson<RemarkApi>('/remarks', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function listStudentSubmissions(token: string) {
  return requestJson<SubmissionListApi>('/submissions/me?limit=100', { token });
}

export async function getSubmissionDetail(token: string, submissionId: string) {
  return requestJson<SubmissionDetailApi>(`/submissions/${submissionId}`, {
    token,
  });
}

export async function listStudentProgress(token: string) {
  return requestJson<ProgressApi>('/submissions/me/progress', { token });
}

export async function listUsers(token: string) {
  return requestJson<UserApi[]>('/users', { token });
}

export async function createUser(
  token: string,
  payload: {
    email: string;
    name: string;
    password: string;
    role: Role;
    studentCode?: string;
  },
) {
  return requestJson<UserApi>('/users', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function deactivateUser(token: string, userId: string) {
  return requestJson<UserApi>(`/users/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export async function listOmrBatches(token: string) {
  return requestJson<OmrBatchApi[]>('/omr/batches', { token });
}

export async function uploadOmrBatch(
  token: string,
  payload: {
    examId: string;
    templateName?: string;
    files: Array<{ uri: string; name: string; type?: string }>;
  },
) {
  const formData = new FormData();
  formData.append('examId', payload.examId);

  if (payload.templateName) {
    formData.append('templateName', payload.templateName);
  }

  payload.files.forEach((file, index) => {
    formData.append('files', {
      uri: file.uri,
      name: file.name || `omr-${index + 1}.jpg`,
      type: file.type || 'image/jpeg',
    } as unknown as Blob);
  });

  return requestJson<OmrBatchApi>('/omr/upload', {
    method: 'POST',
    token,
    body: formData,
  });
}

export function mapClassSummary(
  item: ClassApi,
  assignments: AssignmentApi[] = [],
  role: Role,
): ClassSummary {
  const assignmentCount = assignments.filter((assignment) =>
    assignment.classes.some((link) => link.classId === item.id),
  ).length;

  const pendingAssignments = assignments.filter((assignment) => {
    if (!assignment.classes.some((link) => link.classId === item.id)) {
      return false;
    }

    if (role !== 'STUDENT') {
      return false;
    }

    const mySubmit = assignment.submits?.[0];
    return !mySubmit;
  }).length;

  return {
    id: item.id,
    name: item.name,
    subject: item.subject,
    schoolYear: item.schoolYear,
    code: item.code,
    teacherName: item.teacher.name,
    studentCount: item.enrollments.length,
    assignmentCount,
    pendingAssignments,
  };
}

export function mapClassDetail(item: ClassApi): ClassDetailView {
  return {
    id: item.id,
    name: item.name,
    subject: item.subject,
    schoolYear: item.schoolYear,
    code: item.code,
    teacherName: item.teacher.name,
    studentCount: item.enrollments.length,
    students: item.enrollments.map((entry) => ({
      id: entry.student.id,
      name: entry.student.name,
      studentCode: entry.student.studentCode ?? '',
      email: entry.student.email,
      isActive: entry.student.isActive,
      joinedAt: entry.joinedAt,
    })),
  };
}

export function mapTeacherAssignmentSummary(
  item: AssignmentApi,
  classesById: Map<string, ClassApi>,
): AssignmentSummary {
  const classNames = item.classes
    .map((entry) => classesById.get(entry.classId)?.name)
    .filter((name): name is string => !!name);

  const totalStudents = item.classes.reduce((count, entry) => {
    const classItem = classesById.get(entry.classId);
    return count + (classItem?.enrollments.length ?? 0);
  }, 0);

  return {
    id: item.id,
    title: item.title,
    description: item.description ?? '',
    deadline: item.deadline,
    classNames,
    submitCount: item._count?.submits ?? 0,
    totalStudents,
    submitted: false,
    submitStatus: null,
    gradeStatus: null,
    score: null,
    maxScore: item.maxScore,
    allowLate: item.allowLate,
    latePenaltyPct: item.latePenaltyPct,
  };
}

export function mapStudentAssignmentSummary(
  item: AssignmentApi,
  classesById: Map<string, ClassApi>,
): AssignmentSummary {
  const submit = item.submits?.[0];
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? '',
    deadline: item.deadline,
    classNames: item.classes
      .map((entry) => classesById.get(entry.classId)?.name)
      .filter((name): name is string => !!name),
    submitted: !!submit,
    submitStatus: submit?.submitStatus ?? null,
    gradeStatus: submit?.gradeStatus ?? null,
    score: submit?.score ?? null,
    maxScore: item.maxScore,
    allowLate: item.allowLate,
    latePenaltyPct: item.latePenaltyPct,
  };
}

export function mapExamSummary(item: ExamApi): TeacherExamView {
  return {
    id: item.id,
    title: item.title,
    maxScore: item.maxScore,
    variantCount: item.variants.length,
    classNames: item.classes.map((entry) => entry.name),
    hasSubmissions: false,
    questionCount:
      item.variants[0]?.answerKeys.length ?? item.questionMap.length ?? 0,
  };
}

export function mapQuestionSummary(item: QuestionApi): QuestionSummary {
  return {
    id: item.id,
    content: item.content,
    subject: item.subject,
    difficulty: item.difficulty,
    tags: item.tags,
  };
}

export function mapQuestionDetail(
  item: QuestionApi,
): TeacherQuestionDetailView {
  return {
    id: item.id,
    content: item.content,
    subject: item.subject,
    difficulty: item.difficulty,
    tags: item.tags,
    options: {
      A: item.optionA,
      B: item.optionB,
      C: item.optionC,
      D: item.optionD,
    },
    correctAnswer: item.correctAnswer,
  };
}

export function mapRemarkSummary(item: RemarkApi): RemarkSummary {
  return {
    id: item.id,
    examTitle: item.submissionDetail?.submission?.exam.title ?? '',
    questionNumber: item.submissionDetail?.questionNumber ?? 0,
    reason: item.reason,
    status: item.status,
    createdAt: item.createdAt,
    teacherComment: item.teacherComment ?? undefined,
    studentName: item.submissionDetail?.submission?.student?.name ?? undefined,
    studentCode:
      item.submissionDetail?.submission?.student?.studentCode ?? undefined,
  };
}

export function mapResultSummary(item: SubmissionListApi['items'][number]): ResultSummary {
  return {
    id: item.id,
    examTitle: item.examTitle,
    score: item.score,
    maxScore: item.maxScore,
    totalCorrect: item.totalCorrect,
    totalQuestions: item.totalQuestions,
    status: item.status,
    createdAt: item.createdAt,
  };
}

export function mapResultDetail(item: SubmissionDetailApi): ResultDetailRow[] {
  return item.details.map((detail) => ({
    questionNumber: detail.questionNumber,
    detectedAnswer: detail.detectedAnswer,
    finalAnswer: detail.finalAnswer,
    correctAnswer: detail.correctAnswer,
    isCorrect: detail.isCorrect,
    needsReview: detail.needsReview,
    reviewReason: detail.reviewReason ?? undefined,
  }));
}

export function mapProgressPoint(item: ProgressApi[number]): ProgressPoint {
  return {
    date: item.date,
    score: item.score,
    examTitle: item.examTitle,
  };
}

export function mapUserSummary(item: UserApi): UserSummary {
  return {
    id: item.id,
    name: item.name,
    email: item.email,
    role: item.role,
    studentCode: item.studentCode,
    isActive: item.isActive,
  };
}

export function mapOmrBatchSummary(item: OmrBatchApi): OmrBatchSummary {
  return {
    id: item.id,
    examTitle: item.examTitle,
    status: item.status,
    totalFiles: item.totalFiles,
    successCount: item.successCount,
    failedCount: item.failedCount,
    progressPercentage: item.progressPercentage,
    createdAt: item.createdAt,
  };
}

export async function buildNotifications(
  token: string,
  role: Role,
): Promise<NotificationItem[]> {
  if (role === 'TEACHER') {
    const [remarks, assignments, omrBatches] = await Promise.all([
      listTeacherRemarks(token),
      listAssignments(token),
      listOmrBatches(token),
    ]);

    return [
      ...remarks.slice(0, 5).map((remark) => ({
        id: `remark-${remark.id}`,
        type: 'remark' as const,
        title: remark.submissionDetail?.submission?.exam.title ?? 'Phúc khảo mới',
        body: remark.reason,
        time: remark.createdAt,
        read: remark.status !== 'PENDING',
      })),
      ...assignments.slice(0, 3).map((assignment) => ({
        id: `assignment-${assignment.id}`,
        type: 'assignment' as const,
        title: assignment.title,
        body: `Hạn nộp ${assignment.deadline}`,
        time: assignment.deadline,
        read: false,
      })),
      ...omrBatches.slice(0, 3).map((batch) => ({
        id: `omr-${batch.id}`,
        type: 'system' as const,
        title: batch.examTitle,
        body: `Batch OMR ${batch.status.toLowerCase()}`,
        time: batch.createdAt,
        read: batch.status === 'COMPLETED',
      })),
    ].sort((left, right) => right.time.localeCompare(left.time));
  }

  if (role === 'STUDENT') {
    const [submissions, assignments, remarks] = await Promise.all([
      listStudentSubmissions(token),
      listAssignments(token),
      listStudentRemarks(token),
    ]);

    return [
      ...submissions.items.slice(0, 5).map((submission) => ({
        id: `result-${submission.id}`,
        type: 'result' as const,
        title: submission.examTitle,
        body: `Điểm ${submission.score}/${submission.maxScore}`,
        time: submission.createdAt,
        read: !submission.needsReview,
      })),
      ...assignments.slice(0, 5).map((assignment) => ({
        id: `assignment-${assignment.id}`,
        type: 'assignment' as const,
        title: assignment.title,
        body: `Hạn nộp ${assignment.deadline}`,
        time: assignment.deadline,
        read: !!assignment.submits?.[0],
      })),
      ...remarks.slice(0, 5).map((remark) => ({
        id: `remark-${remark.id}`,
        type: 'remark' as const,
        title: remark.submissionDetail?.submission?.exam.title ?? 'Phúc khảo',
        body: remark.teacherComment || remark.reason,
        time: remark.createdAt,
        read: remark.status !== 'PENDING',
      })),
    ].sort((left, right) => right.time.localeCompare(left.time));
  }

  const [users, classes] = await Promise.all([listUsers(token), listClasses(token)]);

  return [
    ...users.slice(0, 5).map((user) => ({
      id: `user-${user.id}`,
      type: 'system' as const,
      title: user.name,
      body: `${user.role} • ${user.isActive ? 'Đang hoạt động' : 'Đã khoá'}`,
      time: new Date().toISOString(),
      read: user.isActive,
    })),
    ...classes.slice(0, 5).map((classItem) => ({
      id: `class-${classItem.id}`,
      type: 'system' as const,
      title: classItem.name,
      body: `${classItem.subject} • ${classItem.enrollments.length} học sinh`,
      time: classItem.id,
      read: true,
    })),
  ];
}
