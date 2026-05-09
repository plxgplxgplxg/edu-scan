import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Copy,
  ClipboardList,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  classStudents,
  teacherAssignments,
  teacherClasses,
} from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { FilterChips } from '../../components/FilterChips';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { formatVietnameseDate, percentage } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailTab = 'students' | 'assignments' | 'info';

export function TeacherClassDetailScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const layout = useResponsiveLayout();
  const currentClass = teacherClasses[0];
  const [activeTab, setActiveTab] = useState<DetailTab>('students');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentLookup, setStudentLookup] = useState('');
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    deadline: '',
    maxScore: '10',
    latePenaltyPct: '10',
  });

  const tabItems = useMemo(
    () => [
      { id: 'students' as const, label: `${content.common.tabs.students} (${String(classStudents.length)})` },
      { id: 'assignments' as const, label: `${content.common.tabs.assignments} (${String(teacherAssignments.length)})` },
      { id: 'info' as const, label: content.common.sections.info },
    ],
    [content.common.sections.info, content.common.tabs.assignments, content.common.tabs.students],
  );

  return (
    <Screen>
      <PageHeader
        backLabel={content.common.buttons.back}
        title={currentClass.name}
        subtitle={`${currentClass.subject} • ${currentClass.schoolYear}`}
        gradient={['#5B5BD6', '#7C5CFC']}
        onBack={() => navigation.goBack()}
        leadingVisual={<BookOpen size={30} color={palette.white} />}
        footer={(
          <View style={styles.codeRow}>
            <Pressable style={styles.codePill}>
              <Copy size={14} color={palette.white} />
              <AppText variant="label" weight="semibold" color={palette.white}>
                {currentClass.code}
              </AppText>
            </Pressable>
            <View style={styles.studentPill}>
              <Users size={14} color={palette.white} />
              <AppText variant="label" weight="semibold" color={palette.white}>
                {`${String(classStudents.length)} ${content.teacher.classes.studentCountSuffix}`}
              </AppText>
            </View>
          </View>
        )}
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
        <FilterChips value={activeTab} items={tabItems} onChange={setActiveTab} />

        {activeTab === 'students' ? (
          <View style={styles.section}>
            <PrimaryButton
              variant="outline"
              label={content.teacher.classes.addStudent}
              icon={<UserPlus size={18} color={palette.primary} />}
              onPress={() => setShowAddStudent(true)}
            />
            {classStudents.map(student => (
              <SurfaceCard key={student.id} style={styles.rowCard}>
                <View style={styles.avatarCircle}>
                  <AppText variant="label" weight="bold" color={student.isActive ? palette.secondaryForeground : palette.destructive}>
                    {student.name.charAt(0)}
                  </AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="body" weight="medium">
                    {student.name}
                  </AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${student.studentCode} • ${student.joinedAt}`}
                  </AppText>
                </View>
                <Pressable>
                  <Trash2 size={16} color={palette.mutedForeground} />
                </Pressable>
              </SurfaceCard>
            ))}
          </View>
        ) : null}

        {activeTab === 'assignments' ? (
          <View style={styles.section}>
            <PrimaryButton
              variant="outline"
              label={content.teacher.classes.newAssignment}
              icon={<ClipboardList size={18} color={palette.primary} />}
              onPress={() => setShowCreateAssignment(true)}
            />
            {teacherAssignments.map(item => {
              const submitCount = item.submitCount ?? 0;
              const totalStudents = item.totalStudents ?? 0;
              const progress = percentage(submitCount, totalStudents);

              return (
                <SurfaceCard key={item.id} style={styles.assignmentCard}>
                  <View style={[styles.assignmentHead, layout.isCompact ? styles.assignmentHeadStack : null]}>
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
                    <View style={styles.scoreBadge}>
                      <AppText variant="caption" color={palette.secondaryForeground}>
                        {`${String(item.maxScore)} ${content.common.labels.scoreUnit}`}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.assignmentMeta}>
                    <View style={styles.inlineMeta}>
                      <Clock size={12} color={palette.mutedForeground} />
                      <AppText variant="caption" color={palette.mutedForeground}>
                        {`${content.common.form.deadline}: ${formatVietnameseDate(item.deadline)}`}
                      </AppText>
                    </View>
                    <View style={styles.inlineMeta}>
                      <CheckCircle size={12} color={palette.success} />
                      <AppText variant="caption" color={palette.mutedForeground}>
                        {`${String(submitCount)}/${String(totalStudents)}`}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.progressRow}>
                    <View style={styles.flex}>
                      <ProgressBar progress={progress} color={progress === 100 ? palette.success : palette.primary} />
                    </View>
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${String(progress)}%`}
                    </AppText>
                  </View>
                </SurfaceCard>
              );
            })}
          </View>
        ) : null}

        {activeTab === 'info' ? (
          <View style={styles.section}>
            {[
              { label: content.common.form.className, value: currentClass.name },
              { label: content.common.form.subject, value: currentClass.subject },
              { label: content.common.form.schoolYear, value: currentClass.schoolYear },
              { label: content.student.classes.classInfoTitle, value: currentClass.code },
            ].map(item => (
              <SurfaceCard
                key={item.label}
                style={[styles.infoCard, layout.isCompact ? styles.infoCardStack : null]}
              >
                <AppText variant="caption" color={palette.mutedForeground}>
                  {item.label}
                </AppText>
                <AppText variant="body" weight="medium">
                  {item.value}
                </AppText>
              </SurfaceCard>
            ))}
            <PrimaryButton label={content.teacher.classes.updateInfo} onPress={() => undefined} />
          </View>
        ) : null}
      </View>

      <ModalSheet visible={showAddStudent} onClose={() => setShowAddStudent(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.classes.addStudent}
        </AppText>
        <TextInputField
          label={content.teacher.classes.studentsByCode}
          value={studentLookup}
          onChangeText={setStudentLookup}
          placeholder={content.common.placeholders.studentLookup}
        />
        <PrimaryButton
          label={content.teacher.classes.addStudent}
          onPress={() => setShowAddStudent(false)}
          style={styles.sheetButton}
        />
      </ModalSheet>

      <ModalSheet
        visible={showCreateAssignment}
        onClose={() => setShowCreateAssignment(false)}
      >
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.classes.newAssignment}
        </AppText>
        <View style={styles.sheetForm}>
          <TextInputField
            label={content.common.form.assignmentTitle}
            value={assignmentForm.title}
            onChangeText={value =>
              setAssignmentForm(current => ({ ...current, title: value }))
            }
            placeholder={content.common.placeholders.assignmentTitle}
          />
          <TextInputField
            label={content.common.form.assignmentDescription}
            value={assignmentForm.description}
            onChangeText={value =>
              setAssignmentForm(current => ({ ...current, description: value }))
            }
            placeholder={content.common.placeholders.assignmentDescription}
          />
          <TextInputField
            label={content.common.form.deadline}
            value={assignmentForm.deadline}
            onChangeText={value =>
              setAssignmentForm(current => ({ ...current, deadline: value }))
            }
            placeholder={content.common.placeholders.dateTime}
          />
          <TextInputField
            label={content.common.form.maxScore}
            value={assignmentForm.maxScore}
            onChangeText={value =>
              setAssignmentForm(current => ({ ...current, maxScore: value }))
            }
            placeholder={content.common.placeholders.maxScore}
          />
          <PrimaryButton
            label={content.common.buttons.createAssignment}
            onPress={() => setShowCreateAssignment(false)}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: appTheme.spacing.lg,
  },
  codeRow: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
    flexWrap: 'wrap',
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 10,
    borderRadius: appTheme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  studentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: appTheme.spacing.lg,
    paddingVertical: 10,
    borderRadius: appTheme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  section: {
    gap: appTheme.spacing.md,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.secondary,
  },
  flex: {
    flex: 1,
  },
  assignmentCard: {
    gap: appTheme.spacing.md,
    borderLeftWidth: 5,
    borderLeftColor: 'rgba(97,91,227,0.92)',
  },
  assignmentHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: appTheme.spacing.md,
  },
  assignmentHeadStack: {
    flexWrap: 'wrap',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: appTheme.radius.sm,
    backgroundColor: palette.secondary,
  },
  assignmentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.spacing.md,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  infoCardStack: {
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetButton: {
    marginTop: appTheme.spacing.lg,
  },
  sheetForm: {
    gap: appTheme.spacing.lg,
  },
});
