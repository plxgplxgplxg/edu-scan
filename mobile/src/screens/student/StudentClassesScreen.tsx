/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import {
  BookOpen,
  KeyRound,
  Search,
  Users,
  Plus,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { joinClassByCode, listAssignments, listClasses, mapClassSummary, type AssignmentApi, type ClassSummary } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentClassesScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [showJoin, setShowJoin] = useState(false);
  const [search, setSearch] = useState('');
  const [classCode, setClassCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [studentClasses, setStudentClasses] = useState<ClassSummary[]>([]);
  const [assignments, setAssignments] = useState<AssignmentApi[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitial = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [paginatedClasses, assignmentsData] = await Promise.all([
        listClasses(accessToken, 1, 10, search),
        listAssignments(accessToken),
      ]);
      setAssignments(assignmentsData);
      setStudentClasses((paginatedClasses.data || []).map((item) => mapClassSummary(item, assignmentsData, 'STUDENT')));
      setHasMore(paginatedClasses.page < (paginatedClasses.totalPages || 1));
      setPage(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    void fetchInitial();
  }, [fetchInitial]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading || !accessToken) {
      return;
    }
    setLoadingMore(true);
    try {
      const paginatedClasses = await listClasses(accessToken, page, 10, search);
      setStudentClasses((prev) => [
        ...prev,
        ...(paginatedClasses.data || []).map((item) => mapClassSummary(item, assignments, 'STUDENT')),
      ]);
      setHasMore(paginatedClasses.page < (paginatedClasses.totalPages || 1));
      setPage((p) => p + 1);
    } catch (err) {
      // ignore silently
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    void fetchInitial();
  };

  return (
    <Screen scrollable={false} withoutBottomInset>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.student.classes.title}
        subtitle={`${String(studentClasses.length)} ${content.student.classes.activeClasses}`}
        gradient={primaryHeroGradient}
        onBack={() =>
          navigation.navigate('StudentTabs', { screen: 'StudentDashboard' })
        }
        leadingVisual={<BookOpen size={30} color={palette.white} />}
      />

      <FlatList
        data={studentClasses}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={handleRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            paddingBottom: layout.sectionGap + layout.navHeight + 20,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
        ListHeaderComponent={
          <>
            <TextInputField
              value={search}
              onChangeText={setSearch}
              placeholder={content.common.search.classes}
              trailing={<Search size={18} color={palette.mutedForeground} />}
            />
            {error ? (
              <ErrorState
                message={error}
                retryLabel={content.common.buttons.retry}
                onRetry={handleRefresh}
              />
            ) : null}
          </>
        }
        ListFooterComponent={
          <>
            {loadingMore ? <ActivityIndicator size="small" color={palette.primary} style={{ marginVertical: 16 }} /> : null}
          </>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('StudentClassDetail', { classId: item.id })}>
            <SurfaceCard style={styles.card}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    width: layout.headerVisualSize + 10,
                    height: layout.headerVisualSize + 10,
                    borderRadius: layout.heroRadius,
                  },
                ]}
              >
                <BookOpen size={22} color={palette.white} />
              </View>
              <View style={styles.flex}>
                <View style={styles.inlineRow}>
                  {(item.pendingAssignments ?? 0) > 0 ? (
                    <View style={styles.pendingBadge}>
                      <AppText variant="caption" color={palette.warning}>
                        {`${String(item.pendingAssignments ?? 0)} ${content.student.classes.pendingAssignmentsSuffix}`}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText variant="body" weight="medium">
                  {item.name}
                </AppText>
                <View style={styles.metaRow}>
                  <View style={styles.inlineRow}>
                    <Users size={12} color={palette.mutedForeground} />
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${String(item.studentCount)} ${content.teacher.classes.studentCountSuffix}`}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${content.common.labels.teacher}: ${item.teacherName ?? ''}`}
                  </AppText>
                </View>
              </View>
            </SurfaceCard>
          </Pressable>
        )}
      />

      <Pressable
        style={[
          styles.fab,
          {
            bottom: layout.navHeight + 40,
            right: layout.horizontalPadding,
          },
        ]}
        onPress={() => setShowJoin(true)}
      >
        <Plus size={24} color={palette.white} />
      </Pressable>

      <ModalSheet visible={showJoin} onClose={() => setShowJoin(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.student.classes.joinTitle}
        </AppText>
        <AppText variant="body" color={palette.mutedForeground} style={styles.sheetSubtitle}>
          {content.student.classes.joinSubtitle}
        </AppText>
        <TextInputField
          label={content.common.form.className}
          value={classCode}
          onChangeText={setClassCode}
          placeholder={content.common.placeholders.classCode}
        />
        <PrimaryButton
          label={content.common.buttons.joinClass}
          loading={submitting}
          onPress={async () => {
            if (!accessToken) {
              return;
            }

            setSubmitting(true);
            setSubmitError(null);

            try {
              await joinClassByCode(accessToken, classCode.trim());
              setClassCode('');
              setShowJoin(false);
              handleRefresh();
            } catch (err) {
              setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
            } finally {
              setSubmitting(false);
            }
          }}
          style={styles.sheetButton}
        />
        {submitError ? (
          <AppText variant="caption" color={palette.destructive}>
            {submitError}
          </AppText>
        ) : null}
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: appTheme.spacing.lg,
  },
  card: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  pendingBadge: {
    backgroundColor: palette.warningSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: appTheme.radius.pill,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: appTheme.spacing.md,
    flexWrap: 'wrap',
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.sm,
  },
  sheetSubtitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetButton: {
    marginTop: appTheme.spacing.lg,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});
