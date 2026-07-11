import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BookOpen, Home, ScanLine, User } from 'lucide-react-native';

import { BottomNav } from '../components/BottomNav';
import type { ModuleKey, UserRole } from '../types/app';

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
import { TeacherOmrExamsScreen } from '../screens/teacher/TeacherOmrExamsScreen';
import { TeacherOmrScreen } from '../screens/teacher/TeacherOmrScreen';
import { TeacherOmrExamDetailScreen } from '../screens/teacher/TeacherOmrExamDetailScreen';
import { TeacherExamBuilderScreen } from '../screens/teacher/TeacherExamBuilderScreen';
import { StudentDashboardScreen } from '../screens/student/StudentDashboardScreen';
import { StudentClassesScreen } from '../screens/student/StudentClassesScreen';
import { StudentClassDetailScreen } from '../screens/student/StudentClassDetailScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { TeacherStatisticsScreen } from '../screens/teacher/TeacherStatisticsScreen';
import { StudentStatisticsScreen } from '../screens/student/StudentStatisticsScreen';
import { AdminStatisticsScreen } from '../screens/admin/AdminStatisticsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { palette } from '../theme/tokens';

const Stack = createNativeStackNavigator<RootStackParamList>();
const TeacherTab = createBottomTabNavigator<TeacherTabParamList>();
const StudentTab = createBottomTabNavigator<StudentTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

const screenOptions = {
  headerShown: false,
};

function CustomTabBar(props: BottomTabBarProps & { role: UserRole }) {
  const currentScreen = props.state.routes[props.state.index].name as keyof RootStackParamList;
  let currentModule: ModuleKey = 'home';
  if (currentScreen.includes('Classes')) currentModule = 'classes';
  if (currentScreen.includes('OMR')) currentModule = 'omr';
  if (currentScreen.includes('Users')) currentModule = 'users';

  return (
    <BottomNav
      role={props.role}
      currentModule={currentModule}
      currentScreen={currentScreen}
    />
  );
}

function TeacherTabsNavigator() {
  return (
    <TeacherTab.Navigator 
      screenOptions={screenOptions}
      tabBar={props => <CustomTabBar {...props} role="TEACHER" />}
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
          title: 'Kiểm tra',
          tabBarIcon: ({ color, size }) => (
            <ScanLine color={color} size={size + 2} />
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
      screenOptions={screenOptions}
      tabBar={props => <CustomTabBar {...props} role="STUDENT" />}
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
      screenOptions={screenOptions}
      tabBar={props => <CustomTabBar {...props} role="ADMIN" />}
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
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        {!role ? <Stack.Screen name="Login" component={LoginScreen} /> : null}

        {role === 'TEACHER' ? (
          <>
            <Stack.Screen name="TeacherTabs" component={TeacherTabsNavigator} />
            <Stack.Screen
              name="TeacherClassDetail"
              component={TeacherClassDetailScreen}
            />
            <Stack.Screen name="TeacherOmrExams" component={TeacherOmrExamsScreen} />
            <Stack.Screen
              name="TeacherOmrExamDetail"
              component={TeacherOmrExamDetailScreen}
            />
            <Stack.Screen
              name="TeacherOmrExamBuilder"
              component={TeacherExamBuilderScreen}
            />
            <Stack.Screen
              name="SharedNotifications"
              component={NotificationsScreen}
            />
            <Stack.Screen
              name="TeacherStatistics"
              component={TeacherStatisticsScreen}
            />
          </>
        ) : null}

        {role === 'STUDENT' ? (
          <>
            <Stack.Screen name="StudentTabs" component={StudentTabsNavigator} />
            <Stack.Screen
              name="StudentClassDetail"
              component={StudentClassDetailScreen}
            />
            <Stack.Screen
              name="SharedNotifications"
              component={NotificationsScreen}
            />
            <Stack.Screen
              name="StudentStatistics"
              component={StudentStatisticsScreen}
            />
          </>
        ) : null}

        {role === 'ADMIN' ? (
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabsNavigator} />
            <Stack.Screen
              name="SharedNotifications"
              component={NotificationsScreen}
            />
            <Stack.Screen
              name="AdminStatistics"
              component={AdminStatisticsScreen}
            />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
