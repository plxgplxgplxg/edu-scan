import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  CheckCircle,
  ClipboardList,
  Clock,
  Plus,
  Search,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { teacherAssignments } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { EmptyState } from '../../components/EmptyState';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { formatVietnameseDate, percentage } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherAssignmentsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const [search, setSearch] = useState('');

  const items = useMemo(
    () =>
      teacherAssignments.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('TeacherDashboard')}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <View style={styles.titleRow}>
          <AppText variant="title" weight="bold">
            {content.teacher.assignments.title}
          </AppText>
          <View style={styles.iconButton}>
            <Plus size={20} color={palette.white} />
          </View>
        </View>
        <TextInputField
          label={content.common.search.assignments}
          value={search}
          onChangeText={setSearch}
          placeholder={content.common.search.assignments}
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />
      </View>

      <View style={styles.list}>
        {items.map(item => {
          const progress = percentage(item.submitCount ?? 0, item.totalStudents ?? 0);
          const allSubmitted = progress === 100;

          return (
            <SurfaceCard key={item.id} style={styles.card}>
              <View style={styles.flex}>
                <AppText variant="body" weight="medium">
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
      </View>

      <BottomNav role="TEACHER" currentScreen="TeacherAssignments" currentModule="assignments" />
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: appTheme.radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
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
