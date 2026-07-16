import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Users, AlertCircle, Clock, BarChart2 } from 'lucide-react-native';

import { requestJson } from '../../api/http';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { Screen } from '../../components/Screen';
import { PageHeader } from '../../components/PageHeader';
import { SurfaceCard } from '../../components/SurfaceCard';
import { EmptyState } from '../../components/EmptyState';
import { AppText } from '../../components/AppText';

function HorizontalBarChart({ data, color }: { data: { label: string, value: number }[], color: string }) {
  if (!data || data.length === 0) return <AppText color={palette.mutedForeground} style={{ marginVertical: 8 }}>Chưa có dữ liệu</AppText>;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ gap: 12, marginVertical: 8 }}>
      {data.map((item, index) => (
        <View key={index} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="caption" color={palette.foreground} style={{ flex: 1 }} numberOfLines={1}>{item.label}</AppText>
            <AppText variant="caption" color={palette.primary} weight="bold">{item.value}</AppText>
          </View>
          <View style={{ height: 12, backgroundColor: palette.card, borderRadius: 6, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(item.value / maxValue) * 100}%`, backgroundColor: color, borderRadius: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function TeacherStatisticsScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState<'month' | 'week' | 'all'>('month');
  const { accessToken: token } = useAuth();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['teacherStats', filter],
    queryFn: async () => {
      return await requestJson<any>(`/stats/teacher?timeRange=${filter}`, { token: token || '' });
    },
  });

  const [page, setPage] = React.useState(1);
  const [allLateMissing, setAllLateMissing] = React.useState<any[]>([]);

  const { data: lateMissingData, isLoading: isLoadingLate, isFetching: isFetchingLate } = useQuery({
    queryKey: ['teacherLateMissing', filter, page],
    queryFn: async () => {
      return await requestJson<any>(`/stats/teacher/late-missing?timeRange=${filter}&page=${page}&limit=10`, { token: token || '' });
    },
  });

  React.useEffect(() => {
    if (lateMissingData?.data) {
      if (page === 1) {
        setAllLateMissing(lateMissingData.data);
      } else {
        setAllLateMissing(prev => [...prev, ...lateMissingData.data]);
      }
    }
  }, [lateMissingData, page]);

  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  const headerMetrics = stats ? [
    { value: String(stats.totalClasses || 0), label: 'Lớp học' },
    { value: String(stats.totalExams || 0), label: 'Đề kiểm tra' },
    { value: String(stats.totalOmrSubmissions || 0), label: 'Bài đã chấm' },
  ] : undefined;

  return (
    <Screen
      contentContainerStyle={styles.scrollContent}
      scrollViewProps={{ showsVerticalScrollIndicator: false }}
    >
      <PageHeader 
        title="Thống kê giảng dạy" 
        onBack={() => navigation.goBack()} 
        metrics={headerMetrics}
      />
        <View style={styles.sectionHeader}>
          <AppText variant="headline" style={styles.sectionTitle}>Tổng quan</AppText>
          <View style={styles.filterGroup}>
            {(['week', 'month', 'all'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <AppText variant="caption" style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'week' ? 'Tuần' : f === 'month' ? 'Tháng' : 'Tất cả'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {isLoadingStats && (
          <View style={[styles.center, { height: 200 }]}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        )}

        {stats && (
          <>
            <View style={styles.grid}>
              <SurfaceCard style={styles.statCard}>
                <Clock color={palette.warning} size={24} />
                <AppText variant="title" style={styles.statValue}>{stats.activeAssignmentsThisMonth}</AppText>
                <AppText variant="caption" style={styles.statLabel}>Bài đang mở</AppText>
              </SurfaceCard>

              <SurfaceCard style={styles.statCard}>
                <AlertCircle color={palette.destructive} size={24} />
                <AppText variant="title" style={styles.statValue}>{stats.expiredAssignmentsThisMonth}</AppText>
                <AppText variant="caption" style={styles.statLabel}>Bài hết hạn (tháng)</AppText>
              </SurfaceCard>
            </View>

            <AppText variant="headline" style={[styles.sectionTitle, { marginTop: 16 }]}>Biểu đồ học tập</AppText>
            <SurfaceCard style={{ marginTop: 8, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Users color={palette.primary} size={20} />
                <AppText variant="body" weight="bold" color={palette.foreground}>Số học sinh theo lớp</AppText>
              </View>
              <HorizontalBarChart 
                data={(stats.studentsPerClass || []).map((s: any) => ({ label: s.className, value: s.count }))} 
                color={palette.primary} 
              />
            </SurfaceCard>

            <SurfaceCard style={{ marginTop: 12, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <BarChart2 color={palette.secondary} size={20} />
                <AppText variant="body" weight="bold" color={palette.foreground}>Số bài chấm theo đề</AppText>
              </View>
              <HorizontalBarChart 
                data={(stats.submissionsPerExam || []).map((s: any) => ({ label: s.examTitle, value: s.count }))} 
                color={palette.secondary} 
              />
            </SurfaceCard>
          </>
        )}

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <AppText variant="headline" style={styles.sectionTitle}>
            Học sinh trễ/thiếu bài {lateMissingData?.meta?.total !== undefined ? `(${lateMissingData.meta.total} học sinh)` : ''}
          </AppText>
        </View>

        {isLoadingLate && page === 1 ? (
          <ActivityIndicator size="small" color={palette.primary} style={{ marginTop: 24 }} />
        ) : allLateMissing && allLateMissing.length > 0 ? (
          <>
            {allLateMissing.map((student: any) => (
              <SurfaceCard key={student.id} style={styles.studentCard}>
                <View>
                  <AppText variant="body" weight="bold" style={styles.studentName}>{student.name} ({student.studentCode})</AppText>
                  <AppText variant="caption" style={styles.studentSub}>
                    Thiếu: {student.missingCount} • Trễ: {student.lateCount}
                  </AppText>
                </View>
              </SurfaceCard>
            ))}
            {lateMissingData?.meta?.totalPages > page && (
              <TouchableOpacity
                style={{ padding: 12, alignItems: 'center', marginTop: 8 }}
                onPress={() => setPage(p => p + 1)}
                disabled={isFetchingLate}
              >
                {isFetchingLate ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : (
                  <AppText variant="body" color={palette.primary} weight="bold">Tải thêm</AppText>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <EmptyState
              icon={<Users size={24} color={palette.primary} />}
              title="Tuyệt vời! Không có học sinh trễ bài."
            />
          </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: appTheme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: appTheme.spacing.xl,
    marginBottom: appTheme.spacing.md,
  },
  sectionTitle: {
    color: palette.foreground,
  },
  grid: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
    marginBottom: appTheme.spacing.sm,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: appTheme.spacing.md,
  },
  statValue: {
    color: palette.foreground,
    marginTop: appTheme.spacing.sm,
  },
  statLabel: {
    color: palette.mutedForeground,
    marginTop: 4,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: appTheme.spacing.xs,
  },
  filterChip: {
    paddingHorizontal: appTheme.spacing.sm,
    paddingVertical: appTheme.spacing.xs,
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
    color: palette.mutedForeground,
  },
  filterTextActive: {
    color: palette.white,
    fontWeight: '600',
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: appTheme.spacing.sm,
  },
  studentName: {
    color: palette.foreground,
  },
  studentSub: {
    color: palette.destructive,
    marginTop: 4,
  },
});
