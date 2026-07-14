import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Pressable, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { Calendar, ClipboardList, Plus, Search, FileText } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listOmrExams } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { PageHeader } from '../../components/PageHeader';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherOmrScreen() {
  const navigation = useNavigation<Nav>();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();

  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [examsList, setExamsList] = useState<any[]>([]);

  const { data, loading, error, reload } = useAsyncResource(async () => {
    if (!accessToken) return null;
    return listOmrExams(accessToken, page, 20, keyword);
  }, [accessToken, page, keyword]);

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setExamsList(data.data);
      } else {
        setExamsList(prev => {
          const newItems = data.data.filter((newItem: any) => !prev.find(p => p.id === newItem.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [data, page]);

  useFocusEffect(
    useCallback(() => {
      if (page === 1) {
        void reload();
      } else {
        setPage(1); // will trigger reload
      }
    }, [page, reload])
  );

  const handleSearch = (text: string) => {
    setKeyword(text);
    setPage(1);
  };

  const loadMore = () => {
    if (loading || !data) return;
    const totalPages = Math.ceil(data.total / data.limit);
    if (page < totalPages) {
      setPage(p => p + 1);
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === 'PUBLISHED') return { bg: '#E2F2FF', color: palette.info }; // Sẵn sàng
    return { bg: '#FFF1DB', color: palette.warning }; // Đang chấm
  };
  const getStatusLabel = (status: string) => {
    if (status === 'PUBLISHED') return 'Sẵn sàng';
    return 'Bản nháp';
  };

  const renderItem = ({ item: exam }: { item: any }) => {
    const sStyle = getStatusStyle(exam.status);
    return (
      <Pressable onPress={() => navigation.navigate('TeacherOmrExamDetail', { examId: exam.id })}>
        <SurfaceCard style={styles.examCard}>
          <View style={styles.examHeaderRow}>
            <View style={styles.examIconWrapper}>
              <FileText size={20} color={palette.primary} />
            </View>
            <View style={styles.examInfo}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <AppText variant="body" weight="bold" style={{ flex: 1 }}>{exam.title}</AppText>
                <View style={[styles.statusBadge, { backgroundColor: sStyle.bg }]}>
                  <AppText variant="caption" weight="bold" color={sStyle.color}>{getStatusLabel(exam.status)}</AppText>
                </View>
              </View>
              <AppText variant="caption" color={palette.mutedForeground}>
                Chưa có dữ liệu lớp • {exam.questionCount || 0} câu
              </AppText>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Calendar size={14} color={palette.mutedForeground} />
                  <AppText variant="caption" color={palette.mutedForeground}>---</AppText>
                </View>
                <View style={styles.metaItem}>
                  <ClipboardList size={14} color={palette.mutedForeground} />
                  <AppText variant="caption" color={palette.mutedForeground}>0/0 bài</AppText>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '0%' }]} />
          </View>
        </SurfaceCard>
      </Pressable>
    );
  };

  const listHeader = (
    <View style={{ paddingHorizontal: layout.horizontalPadding }}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={palette.mutedForeground} style={styles.searchIcon} />
          <TextInput
            placeholder="Tìm kiếm đề thi..."
            placeholderTextColor={palette.mutedForeground}
            selectionColor={palette.primary}
            value={keyword}
            onChangeText={handleSearch}
            style={{ flex: 1, color: palette.foreground, fontSize: 16, paddingVertical: 10, paddingHorizontal: 0 }}
          />
        </View>
      </View>

      <View style={styles.sectionRow}>
        <AppText variant="body" weight="bold">Đề thi gần đây</AppText>
        <AppText variant="caption" color={palette.mutedForeground}>{data?.total ?? 0} đề</AppText>
      </View>

      {error ? <ErrorState message={error} retryLabel="Thử lại" onRetry={() => void reload()} /> : null}
      {loading && page === 1 ? <LoadingState label="Đang tải danh sách đề thi..." /> : null}
    </View>
  );

  return (
    <Screen scrollable={false}>
      <PageHeader
        overline="EDUSCAN"
        title="Kiểm tra trắc nghiệm"
        subtitle="Quản lý đề thi & chấm bài nhanh chóng"
        gradient={primaryHeroGradient}
        onBack={() => navigation.navigate('TeacherTabs', { screen: 'TeacherDashboard' })}
        footer={
          <View style={styles.headerFooter}>
            <View style={styles.metricsRow}>
              <MetricBox label="Đề thi" value={String(data?.total ?? 0)} />
              <MetricBox label="Bài đã chấm" value="0" />
              <MetricBox label="Còn lại" value="0" />
            </View>
          </View>
        }
      />

      <FlatList
        data={examsList}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContainer, { paddingHorizontal: layout.horizontalPadding }]}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && examsList.length === 0 ? (
            <AppText variant="body" color={palette.mutedForeground} style={{ textAlign: 'center', marginTop: appTheme.spacing.xl }}>
              Chưa có bài thi nào
            </AppText>
          ) : null
        }
        ListFooterComponent={
          loading && page > 1 ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={palette.primary} />
            </View>
          ) : null
        }
      />

      <View style={[styles.fabContainer, { right: layout.horizontalPadding || 16 }]}>
        <PrimaryButton
          label="Tạo đề thi"
          icon={<Plus size={18} color={palette.white} />}
          onPress={() => navigation.navigate('TeacherOmrExamBuilder')}
          style={styles.fab}
        />
      </View>
    </Screen>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <AppText variant="title" weight="bold" color={palette.white}>
        {value}
      </AppText>
      <AppText variant="caption" color="rgba(255,255,255,0.8)">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  headerFooter: {
    marginTop: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  searchContainer: {
    marginTop: 16,
    zIndex: 20,
    elevation: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  listContainer: {
    gap: 12,
    paddingBottom: 100,
  },
  examCard: {
    gap: 16,
    padding: 16,
  },
  examHeaderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  examIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(101, 82, 245, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examInfo: {
    flex: 1,
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: palette.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: palette.tertiary,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 96,
    zIndex: 50,
  },
  fab: {
    borderRadius: 24,
    elevation: 8,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
