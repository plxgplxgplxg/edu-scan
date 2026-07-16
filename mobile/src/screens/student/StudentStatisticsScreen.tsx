import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { BookOpen, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';

import { requestJson } from '../../api/http';
import { useAuth } from '../../store/auth-store';
import { palette, spacing, typography } from '../../theme/tokens';
import { PageHeader } from '../../components/PageHeader';
import { SurfaceCard } from '../../components/SurfaceCard';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';

export function StudentStatisticsScreen() {
  const navigation = useNavigation();
  const { accessToken } = useAuth();
  const token = accessToken || '';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['studentStats'],
    queryFn: async () => {
      return await requestJson<any>('/stats/student', { token });
    },
  });

  if (isLoading) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <PageHeader title="Thống kê học tập" onBack={() => navigation.goBack()} />
        <ActivityIndicator size="large" color={palette.primary} />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <PageHeader title="Thống kê học tập" onBack={() => navigation.goBack()} />
        <EmptyState
          icon={<BookOpen size={24} color={palette.primary} />}
          title="Không thể tải dữ liệu"
          description="Đã xảy ra lỗi khi lấy thống kê"
          actionLabel="Thử lại"
          onAction={refetch}
        />
      </Screen>
    );
  }

  const { overview, recentClasses } = data;

  return (
    <Screen contentContainerStyle={styles.scrollContent}>
      <PageHeader title="Thống kê học tập" onBack={() => navigation.goBack()} />
      <Text style={styles.sectionTitle}>Kết quả học tập</Text>
      
      <View style={styles.grid}>
        <SurfaceCard style={styles.statCard}>
          <BookOpen color={palette.primary} size={24} />
          <Text style={styles.statValue}>{overview.totalAssignments}</Text>
          <Text style={styles.statLabel}>Bài tập</Text>
        </SurfaceCard>

        <SurfaceCard style={styles.statCard}>
          <CheckCircle color={palette.success} size={24} />
          <Text style={styles.statValue}>{overview.completedAssignments}</Text>
          <Text style={styles.statLabel}>Hoàn thành</Text>
        </SurfaceCard>
      </View>

      <Text style={styles.sectionTitle}>Môn học gần đây</Text>
      {recentClasses.length === 0 ? (
        <Text style={styles.emptyText}>Chưa tham gia lớp nào</Text>
      ) : (
        recentClasses.map((cls: any) => (
          <SurfaceCard key={cls.id} style={styles.classCard}>
            <View style={styles.flex}>
              <Text style={styles.className}>{cls.name}</Text>
              <Text style={styles.classSub}>
                Đã nộp: {cls.completedAssignments}/{cls.totalAssignments} bài
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${cls.totalAssignments > 0 ? (cls.completedAssignments / cls.totalAssignments) * 100 : 0}%` }
                ]} 
              />
            </View>
          </SurfaceCard>
        ))
      )}
    </Screen>
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
    marginBottom: spacing.sm,
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
});
