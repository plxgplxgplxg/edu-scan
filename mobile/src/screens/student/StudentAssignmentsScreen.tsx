import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  Clock,
  Link,
  Upload,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { studentAssignments } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { FilterChips } from '../../components/FilterChips';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { formatVietnameseDate, isExpired } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FilterKey = 'all' | 'pending' | 'overdue' | 'submitted';

export function StudentAssignmentsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState('');

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
    [filter],
  );

  return (
    <Screen>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.student.assignments.title}
        subtitle={content.student.assignments.subtitle}
        gradient={['#5B5BD6', '#7C5CFC']}
        onBack={() => navigation.navigate('StudentDashboard')}
        metrics={[
          { label: content.common.tabs.pending, value: String(pendingCount) },
          { label: content.common.tabs.overdue, value: String(overdueCount) },
          { label: content.common.labels.total, value: String(studentAssignments.length) },
        ]}
      />

      <View style={styles.body}>
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
                <View style={styles.rowBetween}>
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
          label={content.common.form.assignmentFileUrl}
          value={fileUrl}
          onChangeText={setFileUrl}
          placeholder={content.common.placeholders.fileUrl}
          trailing={<Link size={16} color={palette.mutedForeground} />}
        />
        <AppText variant="caption" color={palette.mutedForeground} style={styles.sheetHint}>
          {content.common.messages.assignmentUploadHintAlt}
        </AppText>
        <PrimaryButton label={content.common.buttons.confirm} onPress={() => setSelectedId(null)} />
      </ModalSheet>

      <BottomNav role="STUDENT" currentScreen="StudentAssignments" currentModule="assignments" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
  },
  section: {
    gap: appTheme.spacing.md,
  },
  card: {
    gap: appTheme.spacing.md,
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: palette.destructive,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: appTheme.spacing.md,
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
    backgroundColor: '#FEF2F2',
    borderWidth: 0,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetHint: {
    marginVertical: appTheme.spacing.md,
  },
});
