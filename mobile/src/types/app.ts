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
  | 'LATE';

export type TeacherModuleKey =
  | 'home'
  | 'classes'
  | 'omr'
  | 'assignments';

export type StudentModuleKey =
  | 'home'
  | 'classes'
  | 'assignments';

export type AdminModuleKey = 'home' | 'users';

export type ModuleKey = TeacherModuleKey | StudentModuleKey | AdminModuleKey;
