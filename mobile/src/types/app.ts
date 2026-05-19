export type UserRole = 'TEACHER' | 'STUDENT' | 'ADMIN';

export type LanguageCode = 'vi' | 'en';

export type StatusKey =
  | 'GRADED'
  | 'NEEDS_REVIEW'
  | 'FAILED'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL_FAILED'
  | 'ON_TIME'
  | 'LATE'
  | 'APPROVED'
  | 'REJECTED'
  | 'EASY'
  | 'MEDIUM'
  | 'HARD';

export type DifficultyKey = 'EASY' | 'MEDIUM' | 'HARD';

export type TeacherModuleKey =
  | 'home'
  | 'classes'
  | 'exams'
  | 'omr'
  | 'remarks'
  | 'questions'
  | 'assignments';

export type StudentModuleKey =
  | 'home'
  | 'classes'
  | 'results'
  | 'assignments'
  | 'remarks'
  | 'progress';

export type AdminModuleKey = 'home' | 'users' | 'classes';

export type ModuleKey = TeacherModuleKey | StudentModuleKey | AdminModuleKey;
