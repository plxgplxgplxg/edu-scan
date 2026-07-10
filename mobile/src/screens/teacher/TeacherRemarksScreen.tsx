import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, MessageSquare, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listTeacherRemarks, mapRemarkSummary, reviewRemark } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { FilterChips } from '../../components/FilterChips';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import type { RootStackParamList } from '../../navigation/types';
import type { StatusKey } from '../../types/app';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RemarkFilter = 'ALL' | Extract<StatusKey, 'PENDING' | 'APPROVED' | 'REJECTED'>;

export function TeacherRemarksScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [filter, setFilter] = useState<RemarkFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionAnswer, setDecisionAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return [];
      }

      const remarks = await listTeacherRemarks(accessToken);
      return remarks.map(mapRemarkSummary);
    },
    [accessToken],
  );

  const items = useMemo(
    () =>
      (data ?? []).filter(item => filter === 'ALL' || item.status === filter),
    [data, filter],
  );

  const selectedRemark =
    (data ?? []).find(item => item.id === selectedId) ?? items[0];

  const filterItems = [
    { id: 'ALL' as const, label: content.common.labels.all },
    { id: 'PENDING' as const, label: content.common.tabs.pendingReview, count: (data ?? []).filter(item => item.status === 'PENDING').length },
    { id: 'APPROVED' as const, label: content.common.tabs.approved, count: (data ?? []).filter(item => item.status === 'APPROVED').length },
    { id: 'REJECTED' as const, label: content.common.tabs.rejected, count: (data ?? []).filter(item => item.status === 'REJECTED').length },
  ];
  const handleRefresh = () => {
    reload().catch(() => undefined);
  };

  return (
    <Screen refreshing={loading} onRefresh={handleRefresh}>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.teacher.remarks.title}
        subtitle={`${String(items.length)} ${content.common.tabs.pendingReview.toLowerCase()}`}
        gradient={primaryHeroGradient}
        onBack={() => navigation.navigate('TeacherTabs', { screen: 'TeacherDashboard' })}
        leadingVisual={<MessageSquare size={28} color={palette.white} />}
      />

      <View
        style={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            gap: layout.sectionGap,
          },
        ]}
      >
        <FilterChips value={filter} items={filterItems} onChange={setFilter} />
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}
        {items.map(item => (
          <Pressable key={item.id} onPress={() => setSelectedId(item.id)}>
            <SurfaceCard style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <AppText variant="body" weight="medium">
                    {item.studentName ?? ''}
                  </AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {item.studentCode ?? ''}
                  </AppText>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <AppText variant="caption" color={palette.mutedForeground}>
                {`${item.examTitle} • ${content.common.labels.question} ${String(item.questionNumber)}`}
              </AppText>
              <AppText variant="label" color={palette.mutedForeground}>
                {item.reason}
              </AppText>
            </SurfaceCard>
          </Pressable>
        ))}

        {!items.length ? (
          <EmptyState
            title={content.common.messages.emptyRemarks}
            icon={<MessageSquare size={38} color={palette.mutedForeground} />}
          />
        ) : null}
      </View>

      <ModalSheet visible={!!selectedId} onClose={() => setSelectedId(null)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.remarks.detailTitle}
        </AppText>
        <View style={styles.sheetBody}>
          {[
            { label: content.roles.STUDENT, value: selectedRemark.studentName ?? '' },
            { label: content.teacher.exams.title, value: selectedRemark.examTitle },
            { label: content.common.labels.question, value: String(selectedRemark.questionNumber) },
          ].map(item => (
            <SurfaceCard key={item.label} style={styles.infoBlock}>
              <AppText variant="caption" color={palette.mutedForeground}>
                {item.label}
              </AppText>
              <AppText variant="body" weight="medium">
                {item.value}
              </AppText>
            </SurfaceCard>
          ))}
          <SurfaceCard style={styles.infoBlock}>
            <AppText variant="caption" color={palette.mutedForeground}>
              {content.common.form.reason}
            </AppText>
            <AppText variant="body">{selectedRemark.reason}</AppText>
          </SurfaceCard>
          {selectedRemark.status === 'PENDING' ? (
            <>
              <View style={styles.actionRow}>
                {(['A', 'B', 'C', 'D'] as const).map(option => (
                  <Pressable
                    key={option}
                    onPress={() => setDecisionAnswer(option)}
                    style={[
                      styles.answerOption,
                      decisionAnswer === option ? styles.answerActive : null,
                    ]}
                  >
                    <AppText
                      variant="body"
                      weight="semibold"
                      color={decisionAnswer === option ? palette.white : palette.foreground}
                    >
                      {option}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.actionRow}>
                <PrimaryButton
                  label={content.common.buttons.reject}
                  variant="danger"
                  icon={<X size={18} color={palette.destructive} />}
                  loading={submitting}
                  onPress={async () => {
                    if (!accessToken) {
                      return;
                    }

                    setSubmitting(true);
                    setSubmitError(null);

                    try {
                      await reviewRemark(accessToken, selectedRemark.id, {
                        status: 'REJECTED',
                        teacherComment: 'Yêu cầu chưa đủ cơ sở để điều chỉnh.',
                      });
                      setSelectedId(null);
                      await reload();
                    } catch (err) {
                      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  style={styles.flex}
                />
                <PrimaryButton
                  label={content.common.buttons.approve}
                  icon={<Check size={18} color={palette.white} />}
                  loading={submitting}
                  onPress={async () => {
                    if (!accessToken) {
                      return;
                    }

                    setSubmitting(true);
                    setSubmitError(null);

                    try {
                      await reviewRemark(accessToken, selectedRemark.id, {
                        status: 'APPROVED',
                        finalAnswer: decisionAnswer,
                      });
                      setSelectedId(null);
                      await reload();
                    } catch (err) {
                      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  style={styles.flex}
                />
              </View>
              {submitError ? (
                <AppText variant="caption" color={palette.destructive}>
                  {submitError}
                </AppText>
              ) : null}
            </>
          ) : null}
        </View>
      </ModalSheet>

    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: appTheme.spacing.md,
  },
  card: {
    gap: appTheme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  flex: {
    flex: 1,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetBody: {
    gap: appTheme.spacing.md,
  },
  infoBlock: {
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
    flexWrap: 'wrap',
  },
  answerOption: {
    width: 44,
    height: 44,
    borderRadius: appTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.secondary,
  },
  answerActive: {
    backgroundColor: palette.primary,
  },
});
