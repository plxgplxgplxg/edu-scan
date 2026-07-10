import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Clock,
  Link,
  Upload,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  listAssignments,
  listClasses,
  mapStudentAssignmentSummary,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { FilterChips } from '../../components/FilterChips';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import { formatVietnameseDate, isExpired } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';
import { useAssignmentSubmission } from '../../features/assignments/application/useAssignmentSubmission';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FilterKey = 'all' | 'pending' | 'overdue' | 'submitted';

export function StudentAssignmentsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return [];
      }

      const [classes, assignments] = await Promise.all([
        listClasses(accessToken),
        listAssignments(accessToken),
      ]);

      const classMap = new Map(classes.map((item) => [item.id, item]));
      return assignments.map((item) => mapStudentAssignmentSummary(item, classMap));
    },
    [accessToken],
  );
  const studentAssignments = useMemo(() => data ?? [], [data]);

  const pendingCount = studentAssignments.filter(item => !item.submitted).length;
  const overdueCount = studentAssignments.filter(
    item => !item.submitted && isExpired(item.deadline),
  ).length;

  const items = useMemo(
    () =>
      studentAssignments.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'pending') return !item.submitted;
        if (filter === 'overdue') return !item.submitted && isExpired(item.deadline);
        return item.submitted;
      }),
    [filter, studentAssignments],
  );
  const {
    selectedFile,
    submitting,
    submitError,
    pickFile,
    clearSelectedFile,
    submitSelectedFile,
  } = useAssignmentSubmission({
    accessToken,
    onSubmitted: reload,
  });
  const handleRefresh = () => {
    reload().catch(() => undefined);
  };

  return (
    <Screen refreshing={loading} onRefresh={handleRefresh}>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.student.assignments.title}
        subtitle={content.student.assignments.subtitle}
        gradient={primaryHeroGradient}
        onBack={() =>
          navigation.navigate('StudentTabs', { screen: 'StudentDashboard' })
        }
        metrics={[
          { label: content.common.tabs.pending, value: String(pendingCount) },
          { label: content.common.tabs.overdue, value: String(overdueCount) },
          { label: content.common.labels.total, value: String(studentAssignments.length) },
        ]}
      />

      <View
        style={[
          styles.body,
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
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}

        <FilterChips
          value={filter}
          items={[
            { id: 'all', label: content.common.labels.all },
            { id: 'pending', label: content.common.tabs.pending, count: pendingCount },
            { id: 'overdue', label: content.common.tabs.overdue, count: overdueCount },
            { id: 'submitted', label: content.common.tabs.submitted },
          ]}
          onChange={setFilter}
        />

        <View style={styles.section}>
          {items.map(item => {
            const expired = isExpired(item.deadline);
            return (
              <SurfaceCard key={item.id} style={[styles.card, expired && !item.submitted ? styles.overdueCard : null]}>
                <View style={[styles.rowBetween, layout.isCompact ? styles.rowWrap : null]}>
                  <View style={styles.flex}>
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {item.classNames.join(', ')}
                    </AppText>
                    <AppText variant="body" weight="medium">
                      {item.title}
                    </AppText>
                  </View>
                  {item.gradeStatus ? <StatusBadge status={item.gradeStatus} /> : null}
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.inlineMeta}>
                    <Clock size={12} color={expired && !item.submitted ? palette.destructive : palette.mutedForeground} />
                    <AppText
                      variant="caption"
                      color={expired && !item.submitted ? palette.destructive : palette.mutedForeground}
                    >
                      {`${content.common.form.deadline}: ${formatVietnameseDate(item.deadline)}`}
                    </AppText>
                  </View>
                  {item.submitStatus ? <StatusBadge status={item.submitStatus} /> : null}
                </View>
                {item.allowLate && !item.submitted ? (
                  <AppText variant="caption" color={palette.warning}>
                    {`${content.common.messages.lateAllowed} • ${String(item.latePenaltyPct)}%`}
                  </AppText>
                ) : null}
                {!item.submitted && (!expired || item.allowLate) ? (
                  <PrimaryButton
                    label={content.common.buttons.submitAssignment}
                    icon={<Upload size={18} color={palette.white} />}
                    onPress={() => setSelectedId(item.id)}
                  />
                ) : null}
                {!item.submitted && expired && !item.allowLate ? (
                  <SurfaceCard style={styles.expiredState}>
                    <AppText variant="caption" color={palette.destructive}>
                      {content.common.messages.expiredAssignment}
                    </AppText>
                  </SurfaceCard>
                ) : null}
              </SurfaceCard>
            );
          })}
        </View>
      </View>

      <ModalSheet visible={!!selectedId} onClose={() => setSelectedId(null)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.common.buttons.submitAssignment}
        </AppText>
        <TextInputField
          label="Tệp đã chọn"
          value={selectedFile?.name ?? ''}
          editable={false}
          placeholder="Chưa có tệp nào được chọn"
          trailing={<Link size={16} color={palette.mutedForeground} />}
        />
        <AppText variant="caption" color={palette.mutedForeground} style={styles.sheetHint}>
          {content.common.messages.assignmentUploadHintAlt}
        </AppText>
        <PrimaryButton
          label="Chọn tệp"
          variant="outline"
          onPress={() => {
            pickFile().catch(() => undefined);
          }}
        />
        <PrimaryButton
          label={content.common.buttons.confirm}
          variant="soft"
          onPress={() => {
            clearSelectedFile();
            setSelectedId(null);
          }}
        />
        <PrimaryButton
          label={content.common.buttons.submitAssignment}
          loading={submitting}
          onPress={async () => {
            if (!selectedId) {
              return;
            }

            const submitted = await submitSelectedFile(selectedId);
            if (submitted) {
              setSelectedId(null);
            }
          }}
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
  body: {
    gap: appTheme.spacing.md,
  },
  section: {
    gap: appTheme.spacing.md,
  },
  card: {
    gap: appTheme.spacing.md,
  },
  overdueCard: {
    backgroundColor: palette.destructiveSoft,
  },
  rowBetween: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  rowWrap: {
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
    flexWrap: 'wrap',
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiredState: {
    backgroundColor: palette.destructiveSoft,
    borderWidth: 0,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetHint: {
    marginVertical: appTheme.spacing.md,
  },
});
