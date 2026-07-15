import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookOpen, Clock, Upload } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getClassDetail,
  listAssignments,
  mapClassDetail,
  mapStudentAssignmentSummary,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { FilterChips } from '../../components/FilterChips';
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
import { formatVietnameseDate, isExpired } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type TabKey = 'assignments' | 'info';

export function StudentClassDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'StudentClassDetail'>>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const classId = route.params?.classId;
  const assignmentIdParam = route.params?.assignmentId;
  const modeParam = route.params?.mode;
  const [tab, setTab] = React.useState<TabKey>('assignments');

  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken || !classId) return null;

      const [classItem, assignments] = await Promise.all([
        getClassDetail(accessToken, classId),
        listAssignments(accessToken),
      ]);

      const classMap = new Map([[classItem.id, classItem]]);
      return {
        currentClass: mapClassDetail(classItem),
        assignments: assignments
          .filter(item => item.classId === classItem.id)
          .map(item => mapStudentAssignmentSummary(item, classMap)),
      };
    },
    [accessToken, classId],
  );

  React.useEffect(() => {
    if (classId && assignmentIdParam) {
      navigation.replace('StudentAssignmentDetail', {
        classId,
        assignmentId: assignmentIdParam,
        classCode: data?.currentClass.code,
        mode: modeParam,
      });
    }
  }, [assignmentIdParam, classId, data?.currentClass.code, modeParam, navigation]);

  const handleRefresh = () => {
    reload().catch(() => undefined);
  };

  if (!data && loading) {
    return (
      <Screen refreshing={loading} onRefresh={handleRefresh}>
        <LoadingState label={content.common.labels.loading} />
      </Screen>
    );
  }

  if (!data && error) {
    return (
      <Screen refreshing={loading} onRefresh={handleRefresh}>
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
  const classAssignments = data.assignments;

  return (
    <Screen refreshing={loading} onRefresh={handleRefresh}>
      <PageHeader
        backLabel={content.student.classes.title}
        title={currentClass.name}
        subtitle={`${currentClass.subject} • ${content.common.labels.teacher}: ${currentClass.teacherName ?? ''}`}
        gradient={primaryHeroGradient}
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
            gap: layout.sectionGap,
          },
          styles.contentWidth,
        ]}
      >
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
              const canSubmit = !item.submitted && (!expired || item.allowLate);

              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    navigation.navigate('StudentAssignmentDetail', {
                      assignmentId: item.id,
                      classId,
                      classCode: currentClass.code,
                      mode: 'readonly',
                    })
                  }
                >
                  <SurfaceCard style={styles.assignmentCard}>
                    <View style={[styles.assignmentHead, layout.isCompact ? styles.assignmentHeadStack : null]}>
                      <View style={styles.flex}>
                        <AppText variant="body" weight="medium">
                          {item.title}
                        </AppText>
                        {item.description ? (
                          <AppText variant="caption" color={palette.mutedForeground} numberOfLines={2}>
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
                    {item.submitted ? (
                      <AppText variant="label" weight="semibold" color={palette.success}>
                        Đã nộp {item.submittedAt ? `• ${formatVietnameseDate(item.submittedAt)}` : ''}
                      </AppText>
                    ) : null}
                    {item.allowLate && !item.submitted ? (
                      <AppText variant="caption" color={palette.warning}>
                        {`${content.common.messages.lateAllowed} • ${String(item.latePenaltyPct)}%`}
                      </AppText>
                    ) : null}
                    {canSubmit ? (
                      <PrimaryButton
                        label={content.common.buttons.submitAssignment}
                        icon={<Upload size={18} color={palette.white} />}
                        onPress={() =>
                          navigation.navigate('StudentAssignmentDetail', {
                            assignmentId: item.id,
                            classId,
                            classCode: currentClass.code,
                            mode: 'submit',
                          })
                        }
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
                </Pressable>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: appTheme.spacing.lg,
  },
  contentWidth: {
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    gap: appTheme.spacing.md,
  },
  assignmentCard: {
    gap: appTheme.spacing.md,
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
    backgroundColor: palette.destructiveSoft,
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
});
