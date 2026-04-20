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

import { questionBank } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { EmptyState } from '../../components/EmptyState';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherQuestionsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');

  const items = useMemo(
    () =>
      questionBank.filter(item =>
        item.content.toLowerCase().includes(search.toLowerCase()),
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

      <View style={styles.list}>
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
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.questionContent}
          />
          <TextInputField
            label={`${content.teacher.questions.optionLabel} A`}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.optionA}
          />
          <TextInputField
            label={`${content.teacher.questions.optionLabel} B`}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.optionB}
          />
          <TextInputField
            label={`${content.teacher.questions.optionLabel} C`}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.optionC}
          />
          <TextInputField
            label={`${content.teacher.questions.optionLabel} D`}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.optionD}
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
          <PrimaryButton
            label={content.common.buttons.createQuestion}
            onPress={() => setShowCreate(false)}
          />
        </View>
      </ModalSheet>

      <BottomNav role="TEACHER" currentScreen="TeacherQuestions" currentModule="questions" />
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
