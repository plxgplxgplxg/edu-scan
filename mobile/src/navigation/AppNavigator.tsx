import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  Home,
  ScanLine,
  User,
} from 'lucide-react-native';

import { useAuth } from '../store/auth-store';
import type {
  AdminTabParamList,
  RootStackParamList,
  StudentTabParamList,
  TeacherTabParamList,
} from './types';
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
import { palette } from '../theme/tokens';

const Stack = createNativeStackNavigator<RootStackParamList>();
const TeacherTab = createBottomTabNavigator<TeacherTabParamList>();
const StudentTab = createBottomTabNavigator<StudentTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

function TeacherTabsNavigator() {
  return (
    <TeacherTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.mutedForeground,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    >
      <TeacherTab.Screen
        name="TeacherDashboard"
        component={TeacherDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <TeacherTab.Screen
        name="TeacherClasses"
        component={TeacherClassesScreen}
        options={{
          title: 'Lớp học',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <TeacherTab.Screen
        name="TeacherOMR"
        component={TeacherOmrScreen}
        options={{
          title: 'OMR',
          tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size + 2} />,
        }}
      />
      <TeacherTab.Screen
        name="TeacherAssignments"
        component={TeacherAssignmentsScreen}
        options={{
          title: 'Bài tập',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList color={color} size={size} />
          ),
        }}
      />
      <TeacherTab.Screen
        name="SharedProfile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </TeacherTab.Navigator>
  );
}

function StudentTabsNavigator() {
  return (
    <StudentTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.mutedForeground,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    >
      <StudentTab.Screen
        name="StudentDashboard"
        component={StudentDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <StudentTab.Screen
        name="StudentClasses"
        component={StudentClassesScreen}
        options={{
          title: 'Lớp học',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <StudentTab.Screen
        name="StudentAssignments"
        component={StudentAssignmentsScreen}
        options={{
          title: 'Bài tập',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList color={color} size={size} />
          ),
        }}
      />
      <StudentTab.Screen
        name="StudentResults"
        component={StudentResultsScreen}
        options={{
          title: 'Kết quả',
          tabBarIcon: ({ color, size }) => (
            <GraduationCap color={color} size={size} />
          ),
        }}
      />
      <StudentTab.Screen
        name="SharedProfile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </StudentTab.Navigator>
  );
}

function AdminTabsNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.mutedForeground,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    >
      <AdminTab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <AdminTab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <AdminTab.Screen
        name="TeacherClasses"
        component={TeacherClassesScreen}
        options={{
          title: 'Lớp học',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <AdminTab.Screen
        name="SharedProfile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </AdminTab.Navigator>
  );
}

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
            <Stack.Screen name="TeacherTabs" component={TeacherTabsNavigator} />
            <Stack.Screen name="TeacherClassDetail" component={TeacherClassDetailScreen} />
            <Stack.Screen name="TeacherExams" component={TeacherExamsScreen} />
            <Stack.Screen name="TeacherRemarks" component={TeacherRemarksScreen} />
            <Stack.Screen name="TeacherQuestions" component={TeacherQuestionsScreen} />
            <Stack.Screen name="SharedNotifications" component={NotificationsScreen} />
          </>
        ) : null}

        {role === 'STUDENT' ? (
          <>
            <Stack.Screen name="StudentTabs" component={StudentTabsNavigator} />
            <Stack.Screen name="StudentClassDetail" component={StudentClassDetailScreen} />
            <Stack.Screen name="StudentResultDetail" component={StudentResultDetailScreen} />
            <Stack.Screen name="StudentRemarks" component={StudentRemarksScreen} />
            <Stack.Screen name="StudentProgress" component={StudentProgressScreen} />
            <Stack.Screen name="SharedNotifications" component={NotificationsScreen} />
          </>
        ) : null}

        {role === 'ADMIN' ? (
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabsNavigator} />
            <Stack.Screen name="TeacherClassDetail" component={TeacherClassDetailScreen} />
            <Stack.Screen name="SharedNotifications" component={NotificationsScreen} />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
