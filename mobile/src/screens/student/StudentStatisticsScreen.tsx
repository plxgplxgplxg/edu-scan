import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';

import { requestJson } from '../../api/http';
import { useAuth } from '../../store/auth-store';
import { palette, spacing, typography } from '../../theme/tokens';
import { PageHeader } from '../../components/PageHeader';
import { SurfaceCard } from '../../components/SurfaceCard';
import { EmptyState } from '../../components/EmptyState';

export function StudentStatisticsScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const token = session?.accessToken || '';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['studentStats'],
    queryFn: async () => {
      return await requestJson<any>('/stats/student', { token });
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Thống kê học tập" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Thống kê học tập" onBack={() => navigation.goBack()} />
        <EmptyState
          icon={BookOpen}
          title="Không thể tải dữ liệu"
          description="Đã xảy ra lỗi khi lấy thống kê"
          actionLabel="Thử lại"
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader title="Thống kê học tập" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Kết quả học tập</Text>
        
        <View style={styles.grid}>
          <SurfaceCard style={styles.statCard}>
            <BookOpen color={palette.primary} size={24} />
            <Text style={styles.statValue}>{data.totalClasses}</Text>
            <Text style={styles.statLabel}>Lớp tham gia</Text>
          </SurfaceCard>

          <SurfaceCard style={styles.statCard}>
            <CheckCircle color={palette.success} size={24} />
            <Text style={styles.statValue}>{data.onTimeSubmits}</Text>
            <Text style={styles.statLabel}>Nộp đúng hạn</Text>
          </SurfaceCard>
        </View>

        <View style={styles.grid}>
          <SurfaceCard style={styles.statCard}>
            <Clock color={palette.warning} size={24} />
            <Text style={styles.statValue}>{data.lateSubmits}</Text>
            <Text style={styles.statLabel}>Nộp trễ</Text>
          </SurfaceCard>

          <SurfaceCard style={styles.statCard}>
            <AlertCircle color={palette.destructive} size={24} />
            <Text style={styles.statValue}>{data.missingSubmits}</Text>
            <Text style={styles.statLabel}>Chưa nộp</Text>
          </SurfaceCard>
        </View>
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
