import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Clock,
  Info,
  Link,
  Upload,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { studentAssignments, studentClasses } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { FilterChips } from '../../components/FilterChips';
import { ModalSheet } from '../../components/ModalSheet';
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
type TabKey = 'assignments' | 'info';

export function StudentClassDetailScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const currentClass = studentClasses[0];
  const [tab, setTab] = useState<TabKey>('assignments');
  const [showSubmit, setShowSubmit] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState('');

  const classAssignments = useMemo(
    () => studentAssignments.filter(item => item.classNames.includes(currentClass.name)),
    [currentClass.name],
  );

  return (
    <Screen>
      <PageHeader
        backLabel={content.student.classes.title}
        title={currentClass.name}
        subtitle={`${currentClass.subject} • ${content.common.labels.teacher}: ${currentClass.teacherName ?? ''}`}
        gradient={['#5B5BD6', '#7C5CFC']}
        onBack={() => navigation.navigate('StudentClasses')}
      />

      <View style={styles.body}>
        <FilterChips
          value={tab}
          items={[
            { id: 'assignments', label: `${content.common.tabs.assignments} (${String(classAssignments.length)})` },
            { id: 'info', label: content.student.classes.classInfoTitle },
          ]}
          onChange={setTab}
        />

        {tab === 'assignments' ? (
          <View style={styles.section}>
            {classAssignments.map(item => {
              const expired = isExpired(item.deadline);

              return (
                <SurfaceCard key={item.id} style={styles.assignmentCard}>
                  <View style={styles.assignmentHead}>
                    <View style={styles.flex}>
                      <AppText variant="body" weight="medium">
                        {item.title}
                      </AppText>
                      {item.description ? (
                        <AppText variant="caption" color={palette.mutedForeground}>
                          {item.description}
                        </AppText>
                      ) : null}
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
                      onPress={() => setShowSubmit(item.id)}
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
        ) : null}

        {tab === 'info' ? (
          <View style={styles.section}>
            {[
              { label: content.common.form.className, value: currentClass.name },
              { label: content.common.form.subject, value: currentClass.subject },
              { label: content.roles.TEACHER, value: currentClass.teacherName ?? '' },
              { label: content.common.form.schoolYear, value: currentClass.schoolYear },
              { label: content.student.classes.classInfoTitle, value: currentClass.code },
            ].map(item => (
              <SurfaceCard key={item.label} style={styles.infoCard}>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {item.label}
                </AppText>
                <AppText variant="body" weight="medium">
                  {item.value}
                </AppText>
              </SurfaceCard>
            ))}
          </View>
        ) : null}
      </View>

      <ModalSheet visible={!!showSubmit} onClose={() => setShowSubmit(null)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.common.buttons.submitAssignment}
        </AppText>
        <AppText variant="body" color={palette.mutedForeground} style={styles.sheetSubtitle}>
          {studentAssignments.find(item => item.id === showSubmit)?.title ?? ''}
        </AppText>
        <TextInputField
          label={content.common.form.assignmentFileUrl}
          value={fileUrl}
          onChangeText={setFileUrl}
          placeholder={content.common.placeholders.fileUrl}
          trailing={<Link size={16} color={palette.mutedForeground} />}
        />
        <AppText variant="caption" color={palette.mutedForeground} style={styles.sheetHint}>
          {content.common.messages.assignmentUploadHint}
        </AppText>
        <PrimaryButton label={content.common.buttons.confirm} onPress={() => setShowSubmit(null)} />
      </ModalSheet>

      <BottomNav role="STUDENT" currentScreen="StudentClassDetail" currentModule="classes" />
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
  assignmentCard: {
    gap: appTheme.spacing.md,
  },
  assignmentHead: {
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
  infoCard: {
    gap: 4,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.sm,
  },
  sheetSubtitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetHint: {
    marginVertical: appTheme.spacing.md,
  },
});
