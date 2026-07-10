import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BookOpen,
  Clock,
  Link,
  Upload,
} from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getClassDetail,
  listAssignments,
  listClassExams,
  mapClassDetail,
  mapStudentAssignmentSummary,
  submitClassExam,
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
import { formatVietnameseDate, isExpired } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';
import { useAssignmentSubmission } from '../../features/assignments/application/useAssignmentSubmission';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type TabKey = 'assignments' | 'exams' | 'info';

export function StudentClassDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'StudentClassDetail'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const classId = route.params?.classId;
  const [tab, setTab] = useState<TabKey>('assignments');
  const [showSubmit, setShowSubmit] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken || !classId) {
        return null;
      }

      const [classItem, assignments, exams] = await Promise.all([
        getClassDetail(accessToken, classId),
        listAssignments(accessToken),
        listClassExams(accessToken),
      ]);

      const classMap = new Map([[classItem.id, classItem]]);
      return {
        currentClass: mapClassDetail(classItem),
        assignments: assignments
          .filter((item) => item.classes.some((entry) => entry.classId === classItem.id))
          .map((item) => mapStudentAssignmentSummary(item, classMap)),
        exams: exams.filter((item) => item.classes.some((entry) => entry.id === classItem.id)),
      };
    },
    [accessToken, classId],
  );

  const classAssignments = useMemo(
    () => data?.assignments ?? [],
    [data?.assignments],
  );
  const classExams = useMemo(() => data?.exams ?? [], [data?.exams]);
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

  if (!data && loading) {
    return (
      <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (!data && error) {
    return (
      <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
        <ErrorState
          message={error}
          retryLabel={content.common.buttons.retry}
          onRetry={reload}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <ErrorState
          message="Không tìm thấy lớp học"
          retryLabel={content.common.buttons.back}
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const { currentClass } = data;

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <PageHeader
        backLabel={content.student.classes.title}
        title={currentClass.name}
        subtitle={`${currentClass.subject} • ${content.common.labels.teacher}: ${currentClass.teacherName ?? ''}`}
        gradient={['#5B5BD6', '#7C5CFC']}
        onBack={() => navigation.navigate('StudentTabs', { screen: 'StudentClasses' })}
        leadingVisual={<BookOpen size={32} color={palette.white} />}
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
        <FilterChips
          value={tab}
          items={[
            { id: 'assignments', label: `${content.common.tabs.assignments} (${String(classAssignments.length)})` },
            { id: 'exams', label: `Đề thi (${String(classExams.length)})` },
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

        {tab === 'exams' ? (
          <View style={styles.section}>
            {classExams.map((item) => (
              <SurfaceCard key={item.id} style={styles.assignmentCard}>
                <AppText variant="body" weight="medium">{item.title}</AppText>
                <AppText variant="caption" color={palette.mutedForeground}>{`Trạng thái: ${item.status}`}</AppText>
                <PrimaryButton
                  label="Nộp bài"
                  onPress={async () => {
                    if (!accessToken) return;
                    await submitClassExam(accessToken, item.id, { answers: [] });
                    await reload();
                  }}
                />
              </SurfaceCard>
            ))}
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
          </View>
        ) : null}
      </View>

      <ModalSheet visible={!!showSubmit} onClose={() => setShowSubmit(null)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.common.buttons.submitAssignment}
        </AppText>
        <AppText variant="body" color={palette.mutedForeground} style={styles.sheetSubtitle}>
          {classAssignments.find(item => item.id === showSubmit)?.title ?? ''}
        </AppText>
        <TextInputField
          label="Tệp đã chọn"
          value={selectedFile?.name ?? ''}
          editable={false}
          placeholder="Chưa có tệp nào được chọn"
          trailing={<Link size={16} color={palette.mutedForeground} />}
        />
        <AppText variant="caption" color={palette.mutedForeground} style={styles.sheetHint}>
          {content.common.messages.assignmentUploadHint}
        </AppText>
        <PrimaryButton
          label="Chọn tệp"
          variant="outline"
          onPress={() => {
            void pickFile();
          }}
        />
        <PrimaryButton
          label={content.common.buttons.submitAssignment}
          loading={submitting}
          onPress={async () => {
            if (!showSubmit) {
              return;
            }

            const submitted = await submitSelectedFile(showSubmit);
            if (submitted) {
              setShowSubmit(null);
            }
          }}
        />
        <PrimaryButton
          label={content.common.buttons.cancel}
          variant="soft"
          onPress={() => {
            clearSelectedFile();
            setShowSubmit(null);
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
    gap: appTheme.spacing.lg,
  },
  section: {
    gap: appTheme.spacing.md,
  },
  assignmentCard: {
    gap: appTheme.spacing.md,
    borderLeftWidth: 5,
    borderLeftColor: 'rgba(97,91,227,0.92)',
  },
  assignmentHead: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  assignmentHeadStack: {
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
    backgroundColor: '#FEF2F2',
    borderWidth: 0,
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
    marginBottom: appTheme.spacing.sm,
  },
  sheetSubtitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetHint: {
    marginVertical: appTheme.spacing.md,
  },
});
