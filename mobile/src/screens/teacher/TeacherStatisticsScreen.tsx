import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, BookOpen, AlertCircle, Clock } from 'lucide-react-native';

import { requestJson } from '../../api/http';
import { useAuth } from '../../store/auth-store';
import { palette, spacing, typography, radius } from '../../theme/tokens';
import { PageHeader } from '../../components/PageHeader';
import { SurfaceCard } from '../../components/SurfaceCard';
import { EmptyState } from '../../components/EmptyState';

export function TeacherStatisticsScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<'month' | 'week' | 'all'>('month');
  const { session } = useAuth();
  const token = session?.accessToken || '';

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['teacherStats'],
    queryFn: async () => {
      return await requestJson<any>('/stats/teacher', { token });
    },
  });

  const { data: lateMissing, isLoading: isLoadingLate } = useQuery({
    queryKey: ['teacherLateMissing', filter],
    queryFn: async () => {
      return await requestJson<any>(`/stats/teacher/late-missing?timeRange=${filter}`, { token });
    },
  });

  const isLoading = isLoadingStats || isLoadingLate;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Thống kê giảng dạy" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title="Thống kê giảng dạy" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Tổng quan</Text>
        
        {stats && (
          <View style={styles.grid}>
            <SurfaceCard style={styles.statCard}>
              <BookOpen color={palette.primary} size={24} />
              <Text style={styles.statValue}>{stats.totalClasses}</Text>
              <Text style={styles.statLabel}>Lớp học</Text>
            </SurfaceCard>
            
            <SurfaceCard style={styles.statCard}>
              <Users color={palette.info} size={24} />
              <Text style={styles.statValue}>{stats.totalUniqueStudents}</Text>
              <Text style={styles.statLabel}>Học sinh</Text>
            </SurfaceCard>
          </View>
        )}

        {stats && (
          <View style={styles.grid}>
            <SurfaceCard style={styles.statCard}>
              <Clock color={palette.warning} size={24} />
              <Text style={styles.statValue}>{stats.activeAssignmentsThisMonth}</Text>
              <Text style={styles.statLabel}>Bài đang mở</Text>
            </SurfaceCard>

            <SurfaceCard style={styles.statCard}>
              <AlertCircle color={palette.destructive} size={24} />
              <Text style={styles.statValue}>{stats.expiredAssignmentsThisMonth}</Text>
              <Text style={styles.statLabel}>Bài hết hạn (tháng)</Text>
            </SurfaceCard>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Học sinh trễ/thiếu bài</Text>
          <View style={styles.filterGroup}>
            {(['week', 'month', 'all'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'week' ? 'Tuần' : f === 'month' ? 'Tháng' : 'Tất cả'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {lateMissing && lateMissing.length > 0 ? (
          lateMissing.map((student: any) => (
            <SurfaceCard key={student.id} style={styles.studentCard}>
              <View>
                <Text style={styles.studentName}>{student.name} ({student.studentCode})</Text>
                <Text style={styles.studentSub}>
                  Thiếu: {student.missingCount} • Trễ: {student.lateCount}
                </Text>
              </View>
            </SurfaceCard>
          ))
        ) : (
          <EmptyState
            icon={<Users size={24} color={palette.primary} />}
            title="Tuyệt vời!"
            description="Không có học sinh nào thiếu hoặc trễ bài trong khoảng thời gian này."
          />
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: palette.foreground,
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
  filterGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterText: {
    ...typography.caption,
    color: palette.mutedForeground,
  },
  filterTextActive: {
    color: palette.primaryForeground,
    fontWeight: '600',
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  studentName: {
    ...typography.body,
    fontWeight: '600',
    color: palette.foreground,
  },
  studentSub: {
    ...typography.caption,
    color: palette.destructive,
    marginTop: 4,
  },
});
