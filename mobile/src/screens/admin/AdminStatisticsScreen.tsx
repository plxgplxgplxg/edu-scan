import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, BookOpen, GraduationCap } from 'lucide-react-native';

import { requestJson } from '../../api/http';
import { useAuth } from '../../store/auth-store';
import { palette, spacing, typography } from '../../theme/tokens';
import { PageHeader } from '../../components/PageHeader';
import { SurfaceCard } from '../../components/SurfaceCard';
import { EmptyState } from '../../components/EmptyState';

export function AdminStatisticsScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const token = session?.accessToken || '';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      return await requestJson<any>('/stats/admin', { token });
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Thống kê hệ thống" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Thống kê hệ thống" onBack={() => navigation.goBack()} />
        <EmptyState
          icon={<Users size={24} color={palette.primary} />}
          title="Không thể tải dữ liệu"
          description="Đã xảy ra lỗi khi lấy thống kê"
          actionLabel="Thử lại"
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  const { overview, classes } = data;

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title="Thống kê hệ thống" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Tổng quan</Text>
        <View style={styles.grid}>
          <SurfaceCard style={styles.statCard}>
            <Users color={palette.primary} size={24} />
            <Text style={styles.statValue}>{overview.totalTeachers}</Text>
            <Text style={styles.statLabel}>Giáo viên</Text>
          </SurfaceCard>

          <SurfaceCard style={styles.statCard}>
            <GraduationCap color={palette.success} size={24} />
            <Text style={styles.statValue}>{overview.totalStudents}</Text>
            <Text style={styles.statLabel}>Học sinh</Text>
          </SurfaceCard>

          <SurfaceCard style={styles.statCard}>
            <BookOpen color={palette.info} size={24} />
            <Text style={styles.statValue}>{overview.totalClasses}</Text>
            <Text style={styles.statLabel}>Lớp học</Text>
          </SurfaceCard>
        </View>

        <Text style={styles.sectionTitle}>Danh sách lớp học</Text>
        {classes.data.map((c: any) => (
          <SurfaceCard key={c.id} style={styles.classCard}>
            <View>
              <Text style={styles.className}>{c.name}</Text>
              <Text style={styles.classSub}>
                GV: {c.teacherName} • {c.studentCount} HS
              </Text>
            </View>
          </SurfaceCard>
        ))}
        {classes.data.length === 0 && (
          <Text style={styles.emptyText}>Chưa có lớp học nào.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: palette.foreground,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statValue: {
    ...typography.h2,
    color: palette.foreground,
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.caption,
    color: palette.mutedForeground,
    marginTop: 4,
  },
  classCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  className: {
    ...typography.body,
    fontWeight: '600',
    color: palette.foreground,
  },
  classSub: {
    ...typography.caption,
    color: palette.mutedForeground,
    marginTop: 4,
  },
  emptyText: {
    ...typography.body,
    color: palette.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
