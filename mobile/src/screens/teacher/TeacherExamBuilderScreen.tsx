import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listOmrExams, listQuestions, mapQuestionSummary, publishExam, removeExamQuestionAnswer, upsertExamQuestionAnswer } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherExamBuilderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const examId = route.params?.examId as string | undefined;
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [questionNumber, setQuestionNumber] = useState('1');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [questionSearch, setQuestionSearch] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsyncResource(async () => {
    if (!accessToken || !examId) return { exam: null, questions: [] };
    const [exams, questions] = await Promise.all([listOmrExams(accessToken), listQuestions(accessToken, questionSearch)]);
    return { exam: exams.find((item) => item.id === examId) ?? null, questions: questions.items.map(mapQuestionSummary) };
  }, [accessToken, examId, questionSearch]);

  const questionOptions = useMemo(() => data?.questions ?? [], [data?.questions]);

  const parsedQuestionNumber = Math.max(1, Number(questionNumber) || 1);

  const adjustQuestionNumber = (delta: number) => {
    const next = Math.max(1, parsedQuestionNumber + delta);
    setQuestionNumber(String(next));
  };

  if (!examId) {
    return <Screen><ErrorState message="Không tìm thấy examId" retryLabel="Thử lại" onRetry={() => navigation.goBack()} /></Screen>;
  }

  return (
    <Screen>
      <View style={[styles.container, { paddingHorizontal: layout.horizontalPadding, paddingTop: layout.sectionGap, maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>Quay lại</AppText>
        </Pressable>

        <AppText variant="title" weight="bold">Bước 2: Quản lý câu hỏi và đáp án</AppText>

        {loading ? <LoadingState label="Đang tải..." /> : null}
        {error ? <ErrorState message={error} retryLabel="Thử lại" onRetry={() => void reload()} /> : null}

        {data?.exam ? (
          <SurfaceCard style={styles.card}>
            <AppText variant="body" weight="semibold">{data.exam.title}</AppText>
            <AppText variant="caption" color={palette.mutedForeground}>Trạng thái: {data.exam.status}</AppText>
          </SurfaceCard>
        ) : null}

        <SurfaceCard style={styles.card}>
          <AppText variant="label" weight="semibold">Số câu</AppText>
          <View style={styles.numberRow}>
            <Pressable style={styles.numberButton} onPress={() => adjustQuestionNumber(-1)}>
              <AppText variant="headline" weight="bold" style={styles.numberSign}>-</AppText>
            </Pressable>
            <View style={styles.numberInputWrap}>
              <TextInput
                value={questionNumber}
                onChangeText={setQuestionNumber}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={palette.mutedForeground}
                selectionColor={palette.primary}
                style={styles.numberInput}
              />
            </View>
            <Pressable style={styles.numberButton} onPress={() => adjustQuestionNumber(1)}>
              <AppText variant="headline" weight="bold" style={styles.numberSign}>+</AppText>
            </Pressable>
          </View>
          <AppText variant="label" weight="semibold">Đáp án đúng</AppText>
          <View style={styles.answerRow}>
            {(['A', 'B', 'C', 'D'] as const).map((item) => (
              <Pressable key={item} style={[styles.answerOption, correctAnswer === item ? styles.answerActive : null]} onPress={() => setCorrectAnswer(item)}>
                <AppText variant="body" weight="semibold" color={correctAnswer === item ? palette.white : palette.foreground}>{item}</AppText>
              </Pressable>
            ))}
          </View>
          <TextInputField label="Tìm câu hỏi có sẵn" value={questionSearch} onChangeText={setQuestionSearch} placeholder="Tìm theo nội dung" />
          <View style={styles.questionList}>
            {questionOptions.slice(0, 8).map((item) => (
              <Pressable key={item.id} style={[styles.questionOption, selectedQuestionId === item.id ? styles.questionOptionActive : null]} onPress={() => setSelectedQuestionId(item.id)}>
                <AppText variant="caption" color={selectedQuestionId === item.id ? palette.white : palette.foreground}>{item.content}</AppText>
              </Pressable>
            ))}
          </View>
          <PrimaryButton
            label="Thêm/Cập nhật câu"
            loading={busy}
            onPress={async () => {
              if (!accessToken) return;
              setBusy(true);
              setSubmitError(null);
              try {
                await upsertExamQuestionAnswer(accessToken, examId, {
                  questionNumber: parsedQuestionNumber,
                  correctAnswer,
                  questionId: selectedQuestionId,
                });
                await reload();
              } catch (err) {
                setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
              } finally {
                setBusy(false);
              }
            }}
          />
        </SurfaceCard>

        <View style={styles.card}>
          {(data?.exam?.questionMap ?? []).map((item) => {
            const answer = data?.exam?.variants[0]?.answerKeys.find((key) => key.questionNumber === item.questionNumber);
            return (
              <SurfaceCard key={item.questionNumber} style={styles.rowCard}>
                <View style={styles.rowSpace}>
                  <AppText variant="body" weight="semibold">Câu {item.questionNumber} - {answer?.correctAnswer ?? '?'}</AppText>
                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={() => {
                        setQuestionNumber(String(item.questionNumber));
                        if (answer?.correctAnswer) {
                          setCorrectAnswer(answer.correctAnswer);
                        }
                        if (item.questionId) {
                          setSelectedQuestionId(item.questionId);
                        }
                      }}
                    >
                      <Pencil size={16} color={palette.primary} />
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        if (!accessToken) return;
                        setBusy(true);
                        try {
                          await removeExamQuestionAnswer(accessToken, examId, { questionNumber: item.questionNumber });
                          await reload();
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <Trash2 size={16} color={palette.destructive} />
                    </Pressable>
                  </View>
                </View>
                {item.question?.content ? <AppText variant="caption" color={palette.mutedForeground}>{item.question.content}</AppText> : null}
              </SurfaceCard>
            );
          })}
        </View>

        <PrimaryButton
          label="Publish đề thi"
          loading={busy}
          onPress={async () => {
            if (!accessToken) return;
            setBusy(true);
            setSubmitError(null);
            try {
              await publishExam(accessToken, examId);
              navigation.goBack();
            } catch (err) {
              setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
            } finally {
              setBusy(false);
            }
          }}
        />

        {submitError ? <AppText variant="caption" color={palette.destructive}>{submitError}</AppText> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: appTheme.spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card: { gap: appTheme.spacing.sm },
  answerRow: { flexDirection: 'row', gap: appTheme.spacing.sm },
  answerOption: { borderRadius: appTheme.radius.md, borderWidth: 1, borderColor: palette.border, paddingHorizontal: appTheme.spacing.lg, paddingVertical: appTheme.spacing.sm },
  answerActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  numberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: appTheme.spacing.md },
  numberButton: { width: 46, height: 46, borderRadius: appTheme.radius.md, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.secondary },
  numberSign: { lineHeight: 24, textAlign: 'center' },
  numberInputWrap: { width: 120, height: 46, borderRadius: appTheme.radius.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.inputBackground, justifyContent: 'center', paddingHorizontal: appTheme.spacing.md },
  numberInput: { height: 46, paddingVertical: 0, color: palette.foreground, fontSize: appTheme.typography.sizes.xl, fontFamily: appTheme.typography.family, textAlign: 'center' },
  questionList: { gap: appTheme.spacing.xs },
  questionOption: { borderRadius: appTheme.radius.md, borderWidth: 1, borderColor: palette.border, padding: appTheme.spacing.sm },
  questionOptionActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  rowCard: { gap: 6 },
  rowSpace: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.md },
});
