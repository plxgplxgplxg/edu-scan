/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BookOpen,
  KeyRound,
  Search,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { joinClassByCode, listAssignments, listClasses, mapClassSummary } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
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
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentClassesScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [showJoin, setShowJoin] = useState(false);
  const [search, setSearch] = useState('');
  const [classCode, setClassCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return [];
      }

      const [paginatedClasses, assignments] = await Promise.all([
        listClasses(accessToken, 1, 50, search),
        listAssignments(accessToken),
      ]);
      const classes = paginatedClasses.data;

      return classes.map((item) => mapClassSummary(item, assignments, 'STUDENT'));
    },
    [accessToken, search],
  );
  const studentClasses = data ?? [];
  const handleRefresh = () => {
    reload().catch(() => undefined);
  };

  return (
    <Screen refreshing={loading} onRefresh={handleRefresh}>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.student.classes.title}
        subtitle={`${String(studentClasses.length)} ${content.student.classes.activeClasses}`}
        gradient={primaryHeroGradient}
        onBack={() =>
          navigation.navigate('StudentTabs', { screen: 'StudentDashboard' })
        }
        leadingVisual={<BookOpen size={30} color={palette.white} />}
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
        <TextInputField
          label={content.common.search.classes}
          value={search}
          onChangeText={setSearch}
          placeholder={content.common.search.classes}
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}

        {studentClasses.map(item => (
          <Pressable
            key={item.id}
            onPress={() => navigation.navigate('StudentClassDetail', { classId: item.id })}
          >
            <SurfaceCard style={styles.card}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    width: layout.headerVisualSize + 10,
                    height: layout.headerVisualSize + 10,
                    borderRadius: layout.heroRadius,
                  },
                ]}
              >
                <BookOpen size={22} color={palette.white} />
              </View>
              <View style={styles.flex}>
                <View style={styles.inlineRow}>
                  {(item.pendingAssignments ?? 0) > 0 ? (
                    <View style={styles.pendingBadge}>
                      <AppText variant="caption" color={palette.warning}>
                        {`${String(item.pendingAssignments ?? 0)} ${content.student.classes.pendingAssignmentsSuffix}`}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText variant="body" weight="medium">
                  {item.name}
                </AppText>
                <View style={styles.metaRow}>
                  <View style={styles.inlineRow}>
                    <Users size={12} color={palette.mutedForeground} />
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${String(item.studentCount)} ${content.teacher.classes.studentCountSuffix}`}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${content.common.labels.teacher}: ${item.teacherName ?? ''}`}
                  </AppText>
                </View>
              </View>
            </SurfaceCard>
          </Pressable>
        ))}

        <PrimaryButton
          variant="outline"
          label={content.student.classes.joinNewClass}
          icon={<KeyRound size={18} color={palette.primary} />}
          onPress={() => setShowJoin(true)}
        />
      </View>

      <ModalSheet visible={showJoin} onClose={() => setShowJoin(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.student.classes.joinTitle}
        </AppText>
        <AppText variant="body" color={palette.mutedForeground} style={styles.sheetSubtitle}>
          {content.student.classes.joinSubtitle}
        </AppText>
        <TextInputField
          label={content.common.form.className}
          value={classCode}
          onChangeText={setClassCode}
          placeholder={content.common.placeholders.classCode}
        />
        <PrimaryButton
          label={content.common.buttons.joinClass}
          loading={submitting}
          onPress={async () => {
            if (!accessToken) {
              return;
            }

            setSubmitting(true);
            setSubmitError(null);

            try {
              await joinClassByCode(accessToken, classCode.trim());
              setClassCode('');
              setShowJoin(false);
              await reload();
            } catch (err) {
              setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
            } finally {
              setSubmitting(false);
            }
          }}
          style={styles.sheetButton}
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
  list: {
    gap: appTheme.spacing.lg,
  },
  card: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },

  pendingBadge: {
    backgroundColor: palette.warningSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: appTheme.radius.pill,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: appTheme.spacing.md,
    flexWrap: 'wrap',
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.sm,
  },
  sheetSubtitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetButton: {
    marginTop: appTheme.spacing.lg,
  },
});
