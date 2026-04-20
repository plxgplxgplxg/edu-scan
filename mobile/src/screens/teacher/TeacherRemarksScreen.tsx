import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, Check, MessageSquare, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { teacherRemarks } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { EmptyState } from '../../components/EmptyState';
import { FilterChips } from '../../components/FilterChips';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import type { StatusKey } from '../../types/app';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RemarkFilter = 'ALL' | Extract<StatusKey, 'PENDING' | 'APPROVED' | 'REJECTED'>;

export function TeacherRemarksScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const [filter, setFilter] = useState<RemarkFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      teacherRemarks.filter(item => filter === 'ALL' || item.status === filter),
    [filter],
  );

  const selectedRemark =
    teacherRemarks.find(item => item.id === selectedId) ?? teacherRemarks[0];

  const filterItems = [
    { id: 'ALL' as const, label: content.common.labels.all },
    { id: 'PENDING' as const, label: content.common.tabs.pendingReview, count: teacherRemarks.filter(item => item.status === 'PENDING').length },
    { id: 'APPROVED' as const, label: content.common.tabs.approved, count: teacherRemarks.filter(item => item.status === 'APPROVED').length },
    { id: 'REJECTED' as const, label: content.common.tabs.rejected, count: teacherRemarks.filter(item => item.status === 'REJECTED').length },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('TeacherDashboard')}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <AppText variant="title" weight="bold">
          {content.teacher.remarks.title}
        </AppText>
        <FilterChips value={filter} items={filterItems} onChange={setFilter} />
      </View>

      <View style={styles.list}>
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
            <View style={styles.actionRow}>
              <PrimaryButton
                label={content.common.buttons.reject}
                variant="danger"
                icon={<X size={18} color={palette.destructive} />}
                onPress={() => setSelectedId(null)}
                style={styles.flex}
              />
              <PrimaryButton
                label={content.common.buttons.approve}
                icon={<Check size={18} color={palette.white} />}
                onPress={() => setSelectedId(null)}
                style={styles.flex}
              />
            </View>
          ) : null}
        </View>
      </ModalSheet>

      <BottomNav role="TEACHER" currentScreen="TeacherRemarks" currentModule="remarks" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: 56,
    gap: appTheme.spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  list: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
  },
  card: {
    gap: appTheme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
});
