import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Copy,
  Plus,
  Search,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createClass, listClasses, mapClassSummary } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
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


export function TeacherClassesScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken, role } = useAuth();
  const layout = useResponsiveLayout();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    subject: '',
    schoolYear: '2025-2026',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken || !role) {
        return [];
      }

      const classes = await listClasses(accessToken);
      return classes.map((item) => mapClassSummary(item, [], role));
    },
    [accessToken, role],
  );

  const filteredItems = useMemo(
    () =>
      (data ?? []).filter(item => {
        const keyword = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(keyword) ||
          item.subject.toLowerCase().includes(keyword)
        );
      }),
    [data, search],
  );
  const handleRefresh = () => {
    reload().catch(() => undefined);
  };

  return (
    <Screen refreshing={loading} onRefresh={handleRefresh}>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.teacher.classes.title}
        subtitle={`${String(filteredItems.length)} lớp`}
        gradient={primaryHeroGradient}
        onBack={() =>
          navigation.navigate(role === 'ADMIN' ? 'AdminDashboard' : 'TeacherDashboard')
        }
        leadingVisual={<Users size={28} color={palette.white} />}
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
        {role === 'TEACHER' ? (
          <PrimaryButton
            variant="outline"
            label={content.teacher.classes.createTitle}
            icon={<Plus size={18} color={palette.primary} />}
            onPress={() => setShowCreate(true)}
          />
        ) : null}

        <TextInputField
          label={content.common.search.classes}
          value={search}
          onChangeText={setSearch}
          placeholder={content.common.search.classes}
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />

        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? (
          <ErrorState
            message={error}
            retryLabel={content.common.buttons.retry}
            onRetry={reload}
          />
        ) : null}

        {filteredItems.map(item => {
          return (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate('TeacherClassDetail', { classId: item.id })}
            >
              <SurfaceCard style={styles.classCard}>
                <View style={styles.classHeader}>
                  <View style={styles.classContent}>
                    <AppText variant="bodyStrong">
                      {item.name}
                    </AppText>
                    <AppText variant="caption" color={palette.foregroundSoft}>
                      {item.subject}
                    </AppText>
                    <View style={styles.classMeta}>
                      <View style={styles.inlineMeta}>
                        <Users size={13} color={palette.mutedForeground} />
                        <AppText variant="caption" color={palette.mutedForeground}>
                          {`${String(item.studentCount)} ${content.teacher.classes.studentCountSuffix}`}
                        </AppText>
                      </View>
                      <Pressable style={styles.codeBadge}>
                        <Copy size={11} color={palette.secondaryForeground} />
                        <AppText variant="caption" color={palette.secondaryForeground}>
                          {item.code}
                        </AppText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </SurfaceCard>
            </Pressable>
          );
        })}
        {!filteredItems.length ? (
          <EmptyState
            title={content.common.messages.emptyClasses}
            icon={<Users size={38} color={palette.mutedForeground} />}
          />
        ) : null}

      </View>

      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.classes.createTitle}
        </AppText>
        <View style={styles.sheetBody}>
          <TextInputField
            label={content.common.form.className}
            value={formState.name}
            onChangeText={value => setFormState(current => ({ ...current, name: value }))}
            placeholder={content.common.placeholders.className}
          />
          <TextInputField
            label={content.common.form.subject}
            value={formState.subject}
            onChangeText={value => setFormState(current => ({ ...current, subject: value }))}
            placeholder={content.common.placeholders.subject}
          />
          <TextInputField
            label={content.common.form.schoolYear}
            value={formState.schoolYear}
            onChangeText={value =>
              setFormState(current => ({ ...current, schoolYear: value }))
            }
            placeholder={content.common.placeholders.schoolYear}
          />
          <PrimaryButton
            label={content.common.buttons.createClass}
            loading={submitting}
            onPress={async () => {
              if (!accessToken) {
                return;
              }

              setSubmitting(true);
              setSubmitError(null);

              try {
                await createClass(accessToken, formState);
                setShowCreate(false);
                setFormState({
                  name: '',
                  subject: '',
                  schoolYear: '2025-2026',
                });
                await reload();
              } catch (err) {
                setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
              } finally {
                setSubmitting(false);
              }
            }}
          />
          {submitError ? (
            <AppText variant="caption" color={palette.destructive}>
              {submitError}
            </AppText>
          ) : null}
        </View>
      </ModalSheet>

    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: appTheme.spacing.lg,
  },
  classCard: {
    minHeight: 116,
  },
  classHeader: {
    flexDirection: 'row',
  },
  classContent: {
    gap: appTheme.spacing.sm,
    flex: 1,
  },

  classMeta: {
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
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: appTheme.radius.sm,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetBody: {
    gap: appTheme.spacing.lg,
  },
});
