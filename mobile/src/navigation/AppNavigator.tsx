import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../store/auth-store';
import type { RootStackParamList } from './types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { TeacherDashboardScreen } from '../screens/teacher/TeacherDashboardScreen';
import { TeacherClassesScreen } from '../screens/teacher/TeacherClassesScreen';
import { TeacherClassDetailScreen } from '../screens/teacher/TeacherClassDetailScreen';
import { TeacherExamsScreen } from '../screens/teacher/TeacherExamsScreen';
import { TeacherOmrScreen } from '../screens/teacher/TeacherOmrScreen';
import { TeacherAssignmentsScreen } from '../screens/teacher/TeacherAssignmentsScreen';
import { TeacherRemarksScreen } from '../screens/teacher/TeacherRemarksScreen';
import { TeacherQuestionsScreen } from '../screens/teacher/TeacherQuestionsScreen';
import { StudentDashboardScreen } from '../screens/student/StudentDashboardScreen';
import { StudentClassesScreen } from '../screens/student/StudentClassesScreen';
import { StudentClassDetailScreen } from '../screens/student/StudentClassDetailScreen';
import { StudentResultsScreen } from '../screens/student/StudentResultsScreen';
import { StudentResultDetailScreen } from '../screens/student/StudentResultDetailScreen';
import { StudentAssignmentsScreen } from '../screens/student/StudentAssignmentsScreen';
import { StudentRemarksScreen } from '../screens/student/StudentRemarksScreen';
import { StudentProgressScreen } from '../screens/student/StudentProgressScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { role } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!role ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : null}

        {role === 'TEACHER' ? (
          <>
            <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
            <Stack.Screen name="TeacherClasses" component={TeacherClassesScreen} />
            <Stack.Screen name="TeacherClassDetail" component={TeacherClassDetailScreen} />
            <Stack.Screen name="TeacherExams" component={TeacherExamsScreen} />
            <Stack.Screen name="TeacherOMR" component={TeacherOmrScreen} />
            <Stack.Screen name="TeacherAssignments" component={TeacherAssignmentsScreen} />
            <Stack.Screen name="TeacherRemarks" component={TeacherRemarksScreen} />
            <Stack.Screen name="TeacherQuestions" component={TeacherQuestionsScreen} />
          </>
        ) : null}

        {role === 'STUDENT' ? (
          <>
            <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} />
            <Stack.Screen name="StudentClasses" component={StudentClassesScreen} />
            <Stack.Screen name="StudentClassDetail" component={StudentClassDetailScreen} />
            <Stack.Screen name="StudentResults" component={StudentResultsScreen} />
            <Stack.Screen name="StudentResultDetail" component={StudentResultDetailScreen} />
            <Stack.Screen name="StudentAssignments" component={StudentAssignmentsScreen} />
            <Stack.Screen name="StudentRemarks" component={StudentRemarksScreen} />
            <Stack.Screen name="StudentProgress" component={StudentProgressScreen} />
          </>
        ) : null}

        {role === 'ADMIN' ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
            <Stack.Screen name="TeacherClasses" component={TeacherClassesScreen} />
            <Stack.Screen name="TeacherClassDetail" component={TeacherClassDetailScreen} />
          </>
        ) : null}

        {role ? (
          <>
            <Stack.Screen name="SharedProfile" component={ProfileScreen} />
            <Stack.Screen name="SharedNotifications" component={NotificationsScreen} />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
