import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CheckCircle,
  ClipboardList,
  Clock,
  Plus,
  Search,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listAssignments, listClasses, mapTeacherAssignmentSummary } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAppContent } from '../../hooks/useAppContent';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { primaryHeroGradient } from '../../theme/header';
import { formatVietnameseDate, percentage } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherAssignmentsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [search, setSearch] = useState('');
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
      return assignments.map((item) => mapTeacherAssignmentSummary(item, classMap));
    },
    [accessToken],
  );
  const teacherAssignments = useMemo(() => data ?? [], [data]);

  const items = useMemo(
    () =>
      teacherAssignments.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, teacherAssignments],
  );
  const handleRefresh = () => {
    reload().catch(() => undefined);
  };

  return (
    <Screen refreshing={loading} onRefresh={handleRefresh}>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.teacher.assignments.title}
        subtitle={`${String(items.length)} ${content.common.tabs.assignments.toLowerCase()}`}
        gradient={primaryHeroGradient}
        onBack={() =>
          navigation.navigate('TeacherTabs', { screen: 'TeacherDashboard' })
        }
        leadingVisual={<ClipboardList size={28} color={palette.white} />}
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
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}
        <TextInputField
          label={content.common.search.assignments}
          value={search}
          onChangeText={setSearch}
          placeholder={content.common.search.assignments}
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />

        {items.map(item => {
          const progress = percentage(item.submitCount ?? 0, item.totalStudents ?? 0);
          const allSubmitted = progress === 100;

          return (
            <SurfaceCard key={item.id} style={styles.card}>
                <View style={styles.flex}>
                <AppText variant="bodyStrong">
                  {item.title}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {item.classNames.join(', ')}
                </AppText>
                <View style={styles.metaWrap}>
                  <View style={styles.inlineMeta}>
                    <Clock size={12} color={palette.mutedForeground} />
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${content.common.form.deadline}: ${formatVietnameseDate(item.deadline)}`}
                    </AppText>
                  </View>
                  <View style={styles.inlineMeta}>
                    <CheckCircle size={12} color={allSubmitted ? palette.success : palette.warning} />
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${String(item.submitCount ?? 0)}/${String(item.totalStudents ?? 0)}`}
                    </AppText>
                  </View>
                </View>
                <View style={styles.progressRow}>
                  <View style={styles.flex}>
                    <ProgressBar progress={progress} color={allSubmitted ? palette.success : palette.primary} />
                  </View>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${String(progress)}%`}
                  </AppText>
                </View>
              </View>
            </SurfaceCard>
          );
        })}

        {!items.length ? (
          <EmptyState
            title={content.common.messages.emptyAssignments}
            icon={<ClipboardList size={38} color={palette.mutedForeground} />}
          />
        ) : null}

        <PrimaryButton
          variant="outline"
          label={content.common.buttons.createAssignment}
          icon={<Plus size={18} color={palette.primary} />}
          onPress={() => navigation.navigate('TeacherClasses')}
        />
      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: appTheme.spacing.lg,
  },
  card: {
    gap: appTheme.spacing.md,
  },
  flex: {
    flex: 1,
    gap: 6,
  },
  metaWrap: {
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
});
