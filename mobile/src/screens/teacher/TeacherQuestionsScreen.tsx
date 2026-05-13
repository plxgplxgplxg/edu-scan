import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  CircleHelp,
  Plus,
  Search,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createQuestion, listQuestions, mapQuestionSummary } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { ModalSheet } from '../../components/ModalSheet';
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
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherQuestionsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [form, setForm] = useState({
    content: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    subject: '',
    tags: '',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return [];
      }

      const response = await listQuestions(accessToken, search);
      return response.items.map(mapQuestionSummary);
    },
    [accessToken, search],
  );

  const items = useMemo(
    () => data ?? [],
    [data],
  );

  return (
    <Screen>
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.sectionGap,
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
      >
        <Pressable
          style={styles.backRow}
          onPress={() =>
            navigation.navigate('TeacherTabs', { screen: 'TeacherDashboard' })
          }
        >
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <View style={styles.titleRow}>
          <AppText variant="title" weight="bold">
            {content.teacher.questions.title}
          </AppText>
          <Pressable style={styles.iconButton} onPress={() => setShowCreate(true)}>
            <Plus size={20} color={palette.white} />
          </Pressable>
        </View>
        <TextInputField
          label={content.common.search.questions}
          value={search}
          onChangeText={setSearch}
          placeholder={content.common.search.questions}
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />
      </View>

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
            retryLabel={content.common.buttons.confirm}
            onRetry={reload}
          />
        ) : null}

        {items.map(item => (
          <SurfaceCard key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <AppText variant="body" weight="medium" style={styles.flex}>
                {item.content}
              </AppText>
              <StatusBadge status={item.difficulty} />
            </View>
            <View style={styles.tagRow}>
              <View style={styles.subjectBadge}>
                <AppText variant="caption" color={palette.secondaryForeground}>
                  {item.subject}
                </AppText>
              </View>
              {item.tags.map(tag => (
                <View key={tag} style={styles.tagBadge}>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {tag}
                  </AppText>
                </View>
              ))}
            </View>
          </SurfaceCard>
        ))}

        {!items.length ? (
          <EmptyState
            title={content.common.messages.emptyQuestions}
            icon={<CircleHelp size={38} color={palette.mutedForeground} />}
          />
        ) : null}
      </View>

      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.questions.createTitle}
        </AppText>
        <View style={styles.sheetBody}>
          <TextInputField
            label={content.common.form.content}
            value={form.content}
            onChangeText={value => setForm(current => ({ ...current, content: value }))}
            placeholder={content.common.placeholders.questionContent}
          />
          <TextInputField
            label={content.common.form.subject}
            value={form.subject}
            onChangeText={value => setForm(current => ({ ...current, subject: value }))}
            placeholder={content.common.placeholders.subject}
          />
          <TextInputField
            label={`${content.teacher.questions.optionLabel} A`}
            value={form.optionA}
            onChangeText={value => setForm(current => ({ ...current, optionA: value }))}
            placeholder={content.common.placeholders.optionA}
          />
          <TextInputField
            label={`${content.teacher.questions.optionLabel} B`}
            value={form.optionB}
            onChangeText={value => setForm(current => ({ ...current, optionB: value }))}
            placeholder={content.common.placeholders.optionB}
          />
          <TextInputField
            label={`${content.teacher.questions.optionLabel} C`}
            value={form.optionC}
            onChangeText={value => setForm(current => ({ ...current, optionC: value }))}
            placeholder={content.common.placeholders.optionC}
          />
          <TextInputField
            label={`${content.teacher.questions.optionLabel} D`}
            value={form.optionD}
            onChangeText={value => setForm(current => ({ ...current, optionD: value }))}
            placeholder={content.common.placeholders.optionD}
          />
          <TextInputField
            label="Tags"
            value={form.tags}
            onChangeText={value => setForm(current => ({ ...current, tags: value }))}
            placeholder="ví dụ: đại số, chương 1"
          />
          <AppText variant="label" weight="semibold">
            {content.common.form.correctAnswer}
          </AppText>
          <View style={styles.answerRow}>
            {(['A', 'B', 'C', 'D'] as const).map(option => (
              <Pressable
                key={option}
                onPress={() => setSelectedAnswer(option)}
                style={[
                  styles.answerOption,
                  selectedAnswer === option ? styles.answerActive : null,
                ]}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  color={selectedAnswer === option ? palette.white : palette.foreground}
                >
                  {option}
                </AppText>
              </Pressable>
            ))}
          </View>
          <View style={styles.answerRow}>
            {(['EASY', 'MEDIUM', 'HARD'] as const).map(option => (
              <Pressable
                key={option}
                onPress={() => setDifficulty(option)}
                style={[
                  styles.answerOption,
                  difficulty === option ? styles.answerActive : null,
                ]}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  color={difficulty === option ? palette.white : palette.foreground}
                >
                  {content.common.statuses[option]}
                </AppText>
              </Pressable>
            ))}
          </View>
          <PrimaryButton
            label={content.common.buttons.createQuestion}
            loading={submitting}
            onPress={async () => {
              if (!accessToken) {
                return;
              }

              setSubmitting(true);
              setSubmitError(null);

              try {
                await createQuestion(accessToken, {
                  content: form.content.trim(),
                  optionA: form.optionA.trim(),
                  optionB: form.optionB.trim(),
                  optionC: form.optionC.trim(),
                  optionD: form.optionD.trim(),
                  correctAnswer: selectedAnswer,
                  subject: form.subject.trim(),
                  difficulty,
                  tags: form.tags
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                });
                setShowCreate(false);
                setForm({
                  content: '',
                  optionA: '',
                  optionB: '',
                  optionC: '',
                  optionD: '',
                  subject: '',
                  tags: '',
                });
                setDifficulty('MEDIUM');
                setSelectedAnswer('A');
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
  header: {
    gap: appTheme.spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
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
    gap: appTheme.spacing.md,
  },
  card: {
    gap: appTheme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  flex: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.spacing.sm,
  },
  subjectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: appTheme.radius.sm,
    backgroundColor: palette.secondary,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: appTheme.radius.sm,
    backgroundColor: palette.inputBackground,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetBody: {
    gap: appTheme.spacing.lg,
  },
  answerRow: {
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
    flexWrap: 'wrap',
  },
  answerOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: appTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.inputBackground,
  },
  answerActive: {
    backgroundColor: palette.primary,
  },
});
