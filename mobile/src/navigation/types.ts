import type { NavigatorScreenParams } from '@react-navigation/native';

export type TeacherTabParamList = {
  TeacherDashboard: undefined;
  TeacherClasses: undefined;
  TeacherOMR: undefined;
  TeacherAssignments: undefined;
  SharedProfile: undefined;
};

export type StudentTabParamList = {
  StudentDashboard: undefined;
  StudentClasses: undefined;
  StudentAssignments: undefined;
  StudentResults: undefined;
  SharedProfile: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminUsers: undefined;
  TeacherClasses: undefined;
  SharedProfile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  TeacherTabs: NavigatorScreenParams<TeacherTabParamList> | undefined;
  StudentTabs: NavigatorScreenParams<StudentTabParamList> | undefined;
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  TeacherDashboard: undefined;
  TeacherClasses: undefined;
  TeacherClassDetail: { classId?: string } | undefined;
  TeacherExams: undefined;
  TeacherOMR: undefined;
  TeacherAssignments: undefined;
  TeacherRemarks: undefined;
  TeacherQuestions: undefined;
  StudentDashboard: undefined;
  StudentClasses: undefined;
  StudentClassDetail: { classId?: string } | undefined;
  StudentResults: undefined;
  StudentResultDetail: { resultId?: string } | undefined;
  StudentAssignments: undefined;
  StudentRemarks: undefined;
  StudentProgress: undefined;
  AdminDashboard: undefined;
  AdminUsers: undefined;
  SharedProfile: undefined;
  SharedNotifications: undefined;
};
