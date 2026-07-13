import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeFile } from '../features/shared/domain/native-file';

export type TeacherTabParamList = {
  TeacherDashboard: undefined;
  TeacherClasses: undefined;
  TeacherOMR: undefined;
  SharedProfile: undefined;
  SharedNotifications: undefined;
  TeacherStatistics: undefined;
};

export type StudentTabParamList = {
  StudentDashboard: undefined;
  StudentClasses: undefined;
  SharedProfile: undefined;
  SharedNotifications: undefined;
  StudentStatistics: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminUsers: undefined;
  SharedProfile: undefined;
  SharedNotifications: undefined;
  AdminStatistics: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  TeacherTabs: NavigatorScreenParams<TeacherTabParamList> | undefined;
  StudentTabs: NavigatorScreenParams<StudentTabParamList> | undefined;
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  TeacherDashboard: undefined;
  TeacherClasses: undefined;
  TeacherClassDetail: { classId?: string } | undefined;
  TeacherOmrExams: undefined;
  TeacherOmrExamDetail: { examId: string };
  TeacherOmrBatchDetail: { batchId: string };
  TeacherOMR: undefined;
  TeacherOmrExamBuilder: { examId: string };
  TeacherOmrUpload: { examId: string; initialFiles?: NativeFile[] };
  TeacherOmrCamera: { examId: string };
  TeacherOmrProcessing: { examId: string; totalFiles: number };
  StudentDashboard: undefined;
  StudentClasses: undefined;
  StudentClassDetail: { classId?: string; assignmentId?: string; mode?: 'submit' | 'readonly' } | undefined;
  AdminDashboard: undefined;
  AdminUsers: undefined;
  SharedProfile: undefined;
  SharedNotifications: undefined;
  TeacherStatistics: undefined;
  StudentStatistics: undefined;
  AdminStatistics: undefined;
};
