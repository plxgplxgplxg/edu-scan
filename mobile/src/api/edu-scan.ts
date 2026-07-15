import type {
  AssignmentSummary,
  ClassSummary,
  NotificationItem,
  OmrBatchDetail,
  OmrBatchSummary,
  OmrSubmissionDetail,
  OmrSubmissionSummary,
  StudentRecord,
  UserSummary,
} from '../types/domain';
import type { UserRole } from '../types/app';
import { requestBinary, requestJson } from './http';

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
  attachments?: Array<{
    url: string;
    publicId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  }>;
  deadline: string;
  allowLate: boolean;
  latePenaltyPct: number;
  maxScore: number;
  teacherId: string;
  classId: string;
  class?: { id: string; name: string };
  _count?: { submits: number };
  submits?: Array<{
    id: string;
    submitStatus: 'ON_TIME' | 'LATE';
    gradeStatus: 'PENDING' | 'GRADED';
    score: number | null;
    note?: string | null;
    attachments?: Array<{
      url: string;
      publicId: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    }>;
    submittedAt?: string;
  }>;
};

export type AssignmentSubmitApi = {
  id: string;
  assignmentId: string;
  studentId: string;
  note: string | null;
  attachments?: Array<{
    url: string;
    publicId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
  }>;
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
  questionCount?: number;
  submissionCount?: number;
  status: 'DRAFT' | 'PUBLISHED';
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
  createdAt?: string;
  updatedAt?: string;
};

type SubmissionDetailApi = {
  id: string;
  examId: string;
  status: 'GRADED' | 'NEEDS_REVIEW' | 'FAILED';
  createdAt: string;
  imageUrl: string | null;
  studentCode: string | null;
  resolvedTestCode: string | null;
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

type NotificationApi = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  entityId?: string | null;
  batchId?: string | null;
  routeIntent?: NotificationItem['routeIntent'];
};

function getNotificationRouteIntent(
  item: NotificationApi,
): NotificationItem['routeIntent'] {
  if (item.type === 'OMR_BATCH_COMPLETED' && item.entityId) {
    return {
      route: 'TeacherOmrExamDetail',
      examId: item.entityId,
    };
  }

  return item.routeIntent;
}

export type UserApi = {
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
  completedAt?: string | null;
  matchedCount: number;
  unmatchedCount: number;
  submissions: Array<{
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
    status: 'GRADED' | 'NEEDS_REVIEW' | 'FAILED';
    score: number;
    maxScore: number;
    correctCount: number;
    wrongCount: number;
    reviewCount: number;
    needsReview: boolean;
    details: Array<{
      questionNumber: number;
      correctAnswer: string | null;
      detectedAnswer: string | null;
      finalAnswer: string | null;
      isCorrect: boolean;
      needsReview: boolean;
      reviewReason: string | null;
    }>;
  }>;
};

type OmrSubmissionListItemApi = Omit<OmrBatchApi['submissions'][number],
  | 'resolvedVariantId'
  | 'imageUrl'
  | 'processedImageUrl'
  | 'annotatedImageUrl'
  | 'warpOverlayUrl'
  | 'answerScoresUrl'
  | 'details'
> & {
  questionCount: number;
};

export type OmrSubmissionDetailView = OmrBatchApi['submissions'][number];

type OmrBatchSubmissionsPageApi = {
  items: OmrSubmissionListItemApi[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export type PaginatedClassPageApi = {
  data: ClassApi[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type TeacherExamView = {
  id: string;
  title: string;
  maxScore: number;
  status: 'DRAFT' | 'PUBLISHED';
  variantCount: number;
  classNames: string[];
  hasSubmissions: boolean;
  questionCount: number;
  createdAt?: string;
};

export type PaginatedExamPageApi = {
  data: ExamApi[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ReportExportJob = {
  jobId: string;
  classId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  format: 'xlsx' | 'pdf';
  scope: string;
  fileName: string | null;
  mimeType: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

export async function login(email: string, password: string) {
  return requestJson<AuthSession>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function register(
  email: string,
  password: string,
  confirmPassword: string,
  role: Exclude<Role, 'ADMIN'>,
) {
  return requestJson<AuthSession>('/auth/register', {
    method: 'POST',
    body: { email, password, confirmPassword, role },
  });
}

export async function listClasses(token: string, page = 1, limit = 10, keyword?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (keyword) params.set('keyword', keyword);
  return requestJson<PaginatedClassPageApi>(`/classes?${params.toString()}`, { token });
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

export async function searchAvailableStudents(
  token: string,
  classId: string,
  query: string,
  page = 1,
  limit = 10,
) {
  return requestJson<PaginatedResponse<UserApi>>(`/classes/${classId}/available-students?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, {
    token,
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

export async function deleteClass(token: string, classId: string) {
  return requestJson<{ id: string; deleted: boolean }>(`/classes/${classId}`, {
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

export async function deleteAssignment(token: string, assignmentId: string) {
  return requestJson<{ id: string }>(`/assignments/${assignmentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listAssignments(token: string) {
  return requestJson<AssignmentApi[]>('/assignments', { token });
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getAssignmentSubmits(token: string, assignmentId: string, page = 1, limit = 10) {
  return requestJson<PaginatedResponse<AssignmentSubmitApi>>(`/assignments/${assignmentId}/submits?page=${page}&limit=${limit}`, {
    token,
  });
}

export async function gradeAssignmentSubmit(
  token: string,
  assignmentId: string,
  submitId: string,
  payload: { score: number; feedback?: string },
) {
  return requestJson<AssignmentSubmitApi>(
    `/assignments/${assignmentId}/submits/${submitId}/grade`,
    {
      method: 'PATCH',
      token,
      body: payload,
    },
  );
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
    classId: string;
    instructionFiles?: Array<{
      uri: string;
      name: string;
      type?: string;
    }>;
  },
) {
  if (payload.instructionFiles && payload.instructionFiles.length > 0) {
    const formData = new FormData();
    formData.append('title', payload.title);
    if (payload.description) formData.append('description', payload.description);
    formData.append('deadline', payload.deadline);
    formData.append('allowLate', String(!!payload.allowLate));
    formData.append('latePenaltyPct', String(payload.latePenaltyPct ?? 0));
    formData.append('maxScore', String(payload.maxScore ?? 10));
    formData.append('classId', payload.classId);
    
    payload.instructionFiles.forEach(file => {
      formData.append('instructionFiles', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
    });

    return requestJson<AssignmentApi>('/assignments', {
      method: 'POST',
      token,
      body: formData,
    });
  }

  return requestJson<AssignmentApi>('/assignments', {
    method: 'POST',
    token,
    body: {
      title: payload.title,
      description: payload.description,
      deadline: payload.deadline,
      allowLate: payload.allowLate,
      latePenaltyPct: payload.latePenaltyPct,
      maxScore: payload.maxScore,
      classId: payload.classId,
    },
  });
}

export async function updateAssignment(
  token: string,
  assignmentId: string,
  payload: {
    title?: string;
    description?: string;
    deadline?: string;
    allowLate?: boolean;
    latePenaltyPct?: number;
    maxScore?: number;
    instructionFiles?: Array<{
      uri: string;
      name: string;
      type?: string;
    }>;
    attachments?: Array<{
      url: string;
      publicId: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    }>;
  },
) {
  if (payload.instructionFiles && payload.instructionFiles.length > 0) {
    const formData = new FormData();
    if (payload.title) formData.append('title', payload.title);
    if (payload.description) formData.append('description', payload.description);
    if (payload.deadline) formData.append('deadline', payload.deadline);
    if (payload.allowLate !== undefined) formData.append('allowLate', String(payload.allowLate));
    if (payload.latePenaltyPct !== undefined) formData.append('latePenaltyPct', String(payload.latePenaltyPct));
    if (payload.maxScore !== undefined) formData.append('maxScore', String(payload.maxScore));
    
    if (payload.attachments) {
      formData.append('attachments', JSON.stringify(payload.attachments));
    }
    
    payload.instructionFiles.forEach(file => {
      formData.append('instructionFiles', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
    });

    return requestJson<AssignmentApi>(`/assignments/${assignmentId}`, {
      method: 'PATCH',
      token,
      body: formData,
    });
  }

  return requestJson<AssignmentApi>(`/assignments/${assignmentId}`, {
    method: 'PATCH',
    token,
    body: {
      title: payload.title,
      description: payload.description,
      deadline: payload.deadline,
      allowLate: payload.allowLate,
      latePenaltyPct: payload.latePenaltyPct,
      maxScore: payload.maxScore,
      attachments: payload.attachments,
    },
  });
}

export async function submitAssignment(
  token: string,
  assignmentId: string,
  payload: {
    note?: string;
    files?: Array<{
      uri: string;
      name: string;
      type?: string;
    }>;
  },
) {
  if (payload.files && payload.files.length > 0) {
    const formData = new FormData();
    if (payload.note) formData.append('note', payload.note);
    payload.files.forEach(file => {
      formData.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
    });

    return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
      method: 'POST',
      token,
      body: formData,
    });
  }
  
  return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
    method: 'POST',
    token,
    body: { note: payload.note },
  });
}

export async function updateStudentSubmit(
  token: string,
  assignmentId: string,
  payload: {
    note?: string;
    files?: Array<{
      uri: string;
      name: string;
      type?: string;
    }>;
    attachments?: Array<{
      url: string;
      publicId: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    }>;
  },
) {
  if (payload.files && payload.files.length > 0) {
    const formData = new FormData();
    if (payload.note) formData.append('note', payload.note);
    if (payload.attachments) formData.append('attachments', JSON.stringify(payload.attachments));
    payload.files.forEach(file => {
      formData.append('files', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
      } as unknown as Blob);
    });

    return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
      method: 'PATCH',
      token,
      body: formData,
    });
  }
  
  return requestJson<AssignmentSubmitApi>(`/assignments/${assignmentId}/submits`, {
    method: 'PATCH',
    token,
    body: {
      note: payload.note,
      attachments: payload.attachments,
    },
  });
}

export async function listExams(token: string) {
  return requestJson<ExamApi[]>('/exams/my', { token });
}

export async function listOmrExams(token: string, page = 1, limit = 20, keyword?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (keyword) params.set('keyword', keyword);
  return requestJson<PaginatedExamPageApi>(`/exams/omr/my?${params.toString()}`, { token });
}

export async function createExam(
  token: string,
  payload: {
    title: string;
    maxScore: number;
    classIds?: string[];
  },
) {
  return requestJson<ExamApi>('/exams', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function createOmrExam(
  token: string,
  payload: { title: string; maxScore: number; classIds?: string[] },
) {
  return requestJson<ExamApi>('/exams/omr', {
    method: 'POST',
    token,
    body: payload,
  });
}
export async function getExamDetail(token: string, examId: string) {
  return requestJson<ExamApi>(`/exams/${encodeURIComponent(examId)}`, { token });
}

export async function deleteExam(token: string, examId: string) {
  return requestJson<{ id: string; deleted: boolean }>(`/exams/${encodeURIComponent(examId)}`, {
    method: 'DELETE',
    token,
  });
}


export async function updateExam(
  token: string,
  examId: string,
  payload: {
    title?: string;
    maxScore?: number;
    classIds?: string[];
    variants?: Array<{
      testCode: string;
      answerKeys: Array<{
        questionNumber: number;
        correctAnswer: 'A' | 'B' | 'C' | 'D';
      }>;
    }>;
  },
) {
  return requestJson<ExamApi>(`/exams/${encodeURIComponent(examId)}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export async function upsertExamQuestionAnswer(
  token: string,
  examId: string,
  payload: {
    questionNumber: number;
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    testCode?: string;
  },
) {
  return requestJson<ExamApi>(`/exams/${encodeURIComponent(examId)}/answer-keys`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function removeExamQuestionAnswer(
  token: string,
  examId: string,
  payload: { questionNumber: number; testCode?: string },
) {
  return requestJson<ExamApi>(`/exams/${encodeURIComponent(examId)}/answer-keys`, {
    method: 'DELETE',
    token,
    body: payload,
  });
}

export async function publishExam(token: string, examId: string) {
  return requestJson<ExamApi>(`/exams/${encodeURIComponent(examId)}/publish`, {
    method: 'POST',
    token,
  });
}

export async function getSubmissionDetail(token: string, submissionId: string) {
  return requestJson<SubmissionDetailApi>(`/submissions/${submissionId}`, {
    token,
  });
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

export async function getOmrBatchDetail(token: string, batchId: string) {
  return requestJson<OmrBatchApi>(`/omr/batch/${encodeURIComponent(batchId)}`, { token })
    .then(mapOmrBatchDetail);
}

export async function getOmrBatchHeader(token: string, batchId: string) {
  return requestJson<OmrBatchApi>(`/omr/batch/${encodeURIComponent(batchId)}/header`, { token });
}

export async function getOmrBatchSubmissions(
  token: string,
  batchId: string,
  page: number,
  status?: string,
) {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) {
    params.set('status', status);
  }

  return requestJson<OmrBatchSubmissionsPageApi>(
    `/omr/batch/${encodeURIComponent(batchId)}/submissions?${params.toString()}`,
    { token },
  );
}

export async function getExamSubmissions(
  token: string,
  examId: string,
  page: number,
  keyword?: string,
  variantCode?: string,
  sortScore?: 'asc' | 'desc',
) {
  const params = new URLSearchParams({ page: String(page), limit: '10' });
  if (keyword) params.set('keyword', keyword);
  if (variantCode) params.set('variantCode', variantCode);
  if (sortScore) params.set('sortScore', sortScore);

  return requestJson<OmrBatchSubmissionsPageApi>(
    `/exams/${encodeURIComponent(examId)}/submissions?${params.toString()}`,
    { token },
  );
}

export async function getOmrSubmissionDetail(
  token: string,
  submissionId: string,
) {
  return requestJson<OmrSubmissionDetailView>(
    `/omr/submissions/${encodeURIComponent(submissionId)}`,
    { token },
  );
}

export async function updateSubmissionOverride(
  token: string,
  submissionId: string,
  payload: {
    studentCode?: string;
    resolvedTestCode?: string;
    details?: Array<{
      questionNumber: number;
      finalAnswer: 'A' | 'B' | 'C' | 'D';
    }>;
  },
) {
  return requestJson<SubmissionDetailApi>(
    `/submissions/${encodeURIComponent(submissionId)}/override`,
    {
      method: 'PATCH',
      token,
      body: payload,
    },
  );
}

export async function updateSubmissionAnswers(
  token: string,
  submissionId: string,
  answers: Array<{
    questionNumber: number;
    finalAnswer?: 'A' | 'B' | 'C' | 'D' | null;
  }>,
) {
  return requestJson<SubmissionDetailApi>(
    `/submissions/${encodeURIComponent(submissionId)}/answers`,
    {
      method: 'PATCH',
      token,
      body: { answers },
    },
  );
}

export async function updateSubmissionDetail(
  token: string,
  submissionId: string,
  questionNumber: number,
  finalAnswer: 'A' | 'B' | 'C' | 'D' | null,
) {
  return requestJson<SubmissionDetailApi>(
    `/submissions/${encodeURIComponent(submissionId)}/details/${questionNumber}`,
    {
      method: 'PATCH',
      token,
      body: { finalAnswer },
    },
  );
}

export async function exportClassReport(
  token: string,
  classId: string,
  format: 'xlsx' | 'pdf',
) {
  return requestBinary(
    `/reports/class/${encodeURIComponent(classId)}?format=${encodeURIComponent(format)}&scope=all`,
    { token },
  );
}

export async function createClassReportExportJob(
  token: string,
  classId: string,
  format: 'xlsx' | 'pdf',
) {
  return requestJson<ReportExportJob>(
    `/reports/class/${encodeURIComponent(classId)}/jobs?format=${encodeURIComponent(format)}&scope=all`,
    {
      method: 'POST',
      token,
    },
  );
}

export async function getClassReportExportJob(token: string, jobId: string) {
  return requestJson<ReportExportJob>(
    `/reports/jobs/${encodeURIComponent(jobId)}`,
    { token },
  );
}

export async function downloadClassReportExportFile(token: string, jobId: string) {
  return requestBinary(
    `/reports/jobs/${encodeURIComponent(jobId)}/file`,
    { token },
  );
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
  const assignmentCount = assignments.filter((assignment) => assignment.classId === item.id).length;

  const pendingAssignments = assignments.filter((assignment) => {
    if (assignment.classId !== item.id) {
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
  const classItem = classesById.get(item.classId);
  const classNames = [classItem?.name ?? item.class?.name].filter((name): name is string => !!name);

  const totalStudents = classItem?.enrollments.length ?? 0;

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
    attachments: item.attachments ?? [],
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
    classNames: [classesById.get(item.classId)?.name ?? item.class?.name].filter((name): name is string => !!name),
    submitted: !!submit,
    submitStatus: submit?.submitStatus ?? null,
    gradeStatus: submit?.gradeStatus ?? null,
    score: submit?.score ?? null,
    maxScore: item.maxScore,
    allowLate: item.allowLate,
    latePenaltyPct: item.latePenaltyPct,
    attachments: item.attachments ?? [],
    submittedAt: submit?.submittedAt ?? null,
    submittedNote: submit?.note ?? null,
    submittedAttachments: submit?.attachments ?? [],
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
    status: item.status,
    questionCount: item.variants[0]?.answerKeys.length ?? 0,
    createdAt: (item as any).createdAt,
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

export function mapOmrSubmissionDetail(item: OmrSubmissionDetailApi): OmrSubmissionDetail {
  return {
    questionNumber: item.questionNumber,
    correctAnswer: item.correctAnswer,
    detectedAnswer: item.detectedAnswer,
    finalAnswer: item.finalAnswer,
    isCorrect: item.isCorrect,
    needsReview: item.needsReview,
    reviewReason: item.reviewReason ?? undefined,
  };
}

type OmrSubmissionDetailApi = OmrBatchApi['submissions'][number]['details'][number];

export function mapOmrSubmissionSummary(
  item: OmrBatchApi['submissions'][number],
): OmrSubmissionSummary {
  return {
    id: item.id,
    studentId: item.studentId,
    studentCode: item.studentCode,
    studentName: item.studentName,
    detectedTestId: item.detectedTestId,
    resolvedTestCode: item.resolvedTestCode,
    resolvedVariantId: item.resolvedVariantId,
    testCodeResolutionStatus: item.testCodeResolutionStatus,
    imageUrl: item.imageUrl,
    processedImageUrl: item.processedImageUrl,
    annotatedImageUrl: item.annotatedImageUrl,
    warpOverlayUrl: item.warpOverlayUrl,
    answerScoresUrl: item.answerScoresUrl,
    status: item.status,
    score: item.score,
    maxScore: item.maxScore,
    correctCount: item.correctCount,
    wrongCount: item.wrongCount,
    reviewCount: item.reviewCount,
    needsReview: item.needsReview,
    details: item.details.map(mapOmrSubmissionDetail),
  };
}

export function mapOmrBatchDetail(item: OmrBatchApi): OmrBatchDetail {
  return {
    id: item.id,
    examId: item.examId,
    examTitle: item.examTitle,
    teacherId: item.teacherId,
    status: item.status,
    totalFiles: item.totalFiles,
    processedFiles: item.processedFiles,
    successCount: item.successCount,
    failedCount: item.failedCount,
    progressPercentage: item.progressPercentage,
    createdAt: item.createdAt,
    completedAt: item.completedAt,
    matchedCount: item.matchedCount,
    unmatchedCount: item.unmatchedCount,
    submissions: item.submissions.map(mapOmrSubmissionSummary),
  };
}

export async function buildNotifications(
  token: string,
  role: Role,
): Promise<NotificationItem[]> {
  if (role === 'TEACHER') {
    const [assignments, omrBatches] = await Promise.all([
      listAssignments(token),
      listOmrBatches(token),
    ]);

    return [
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
        body: `Đợt chấm bài ${batch.status.toLowerCase()}`,
        time: batch.createdAt,
        read: batch.status === 'COMPLETED',
      })),
    ].sort((left, right) => right.time.localeCompare(left.time));
  }

  if (role === 'STUDENT') {
    const assignments = await listAssignments(token);

    return [
      ...assignments.slice(0, 5).map((assignment) => ({
        id: `assignment-${assignment.id}`,
        type: 'assignment' as const,
        title: assignment.title,
        body: `Hạn nộp ${assignment.deadline}`,
        time: assignment.deadline,
        read: !!assignment.submits?.[0],
      })),
    ].sort((left, right) => right.time.localeCompare(left.time));
  }

  const [users, paginatedClasses] = await Promise.all([listUsers(token), listClasses(token)]);
  const classes = paginatedClasses.data || [];

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

export async function listNotifications(token: string) {
  const items = await requestJson<NotificationApi[]>('/notifications', { token });
  return items.map((item): NotificationItem => ({
    id: item.id,
    type: item.type.startsWith('ASSIGNMENT') ? 'assignment' : item.type.startsWith('OMR') ? 'result' : 'system',
    title: item.title,
    body: item.body,
    time: item.createdAt,
    read: !!item.readAt,
    routeIntent: getNotificationRouteIntent(item),
  }));
}

export async function markNotificationRead(token: string, notificationId: string) {
  return requestJson<{ id: string; read: boolean }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export type TeacherStatsOverview = {
  totalClasses: number;
  totalUniqueStudents: number;
  activeAssignmentsThisMonth: number;
  expiredAssignmentsThisMonth: number;
};

export type StudentStatsOverview = {
  totalClasses: number;
  onTimeSubmits: number;
  lateSubmits: number;
  missingSubmits: number;
};

export type AdminStatsOverview = {
  overview: {
    totalTeachers: number;
    totalStudents: number;
    totalClasses: number;
  };
  classes: {
    data: Array<{
      id: string;
      name: string;
      code: string;
      subject: string;
      teacherName: string;
      studentCount: number;
    }>;
    meta: { total: number; page: number; limit: number; totalPages: number };
  };
};

export async function getTeacherStats(token: string) {
  return requestJson<TeacherStatsOverview>('/stats/teacher', { token });
}

export async function getStudentStats(token: string) {
  return requestJson<StudentStatsOverview>('/stats/student', { token });
}

export async function getAdminStats(token: string, page = 1, limit = 10, search = '') {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.append('search', search);
  return requestJson<AdminStatsOverview>(`/stats/admin?${query.toString()}`, { token });
}

export async function getTeacherClassStats(token: string, classId: string) {
  return requestJson<{ studentCount: number; activeAssignments: number; submissionRate: number }>(
    `/stats/teacher/class/${classId}`,
    { token }
  );
}
