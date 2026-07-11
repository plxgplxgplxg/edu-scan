/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, Alert } from 'react-native';
import { ArrowLeft, Copy, Pencil, Plus, Trash2, ChevronRight } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  listOmrExams,
  publishExam,
  updateExam,
} from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { ModalSheet } from '../../components/ModalSheet';
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

type AnswerKeyItem = {
  questionNumber: number;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
};

type VariantState = {
  testCode: string;
  answerKeys: AnswerKeyItem[];
};

export function TeacherExamBuilderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const examId = route.params?.examId as string | undefined;
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 states
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState('10');
  const [questionCount, setQuestionCount] = useState('10');

  const [localVariants, setLocalVariants] = useState<VariantState[]>([]);
  const [selectedTestCode, setSelectedTestCode] = useState<string>('');
  
  const [questionNumber, setQuestionNumber] = useState('1');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // For adding a new test code
  const [showAddCode, setShowAddCode] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');

  // For copying answers
  const [showCopyCode, setShowCopyCode] = useState(false);

  const { data, loading, error, reload } = useAsyncResource(async () => {
    if (!accessToken || !examId) return null;
    const exams = await listOmrExams(accessToken);
    return exams.find((item) => item.id === examId) ?? null;
  }, [accessToken, examId, selectedTestCode]);

  // Sync with remote
  useEffect(() => {
    if (data) {
      setTitle(data.title ?? '');
      setMaxScore(String(data.maxScore ?? 10));
      setQuestionCount(String((data as any).questionCount ?? 10));

      if (data.variants && data.variants.length > 0) {
        setLocalVariants(data.variants.map((v) => ({
          testCode: v.testCode,
          answerKeys: [...v.answerKeys].sort((a, b) => a.questionNumber - b.questionNumber),
        })));
        if (!selectedTestCode || !data.variants.find(v => v.testCode === selectedTestCode)) {
          setSelectedTestCode(data.variants[0].testCode);
        }
      } else {
        setLocalVariants([{ testCode: '001', answerKeys: [] }]);
        setSelectedTestCode('001');
      }
    }
  }, [data, selectedTestCode]);

  const parsedQuestionNumber = Math.max(1, Number(questionNumber) || 1);
  const currentVariantIndex = localVariants.findIndex(v => v.testCode === selectedTestCode);
  const currentVariant = currentVariantIndex >= 0 ? localVariants[currentVariantIndex] : null;
  const answerKeys = currentVariant?.answerKeys ?? [];

  const adjustQuestionNumber = (delta: number) => {
    const next = Math.max(1, parsedQuestionNumber + delta);
    setQuestionNumber(String(next));
  };

  const saveToBackend = async (variantsToSave: VariantState[]) => {
    if (!accessToken || !examId) return;
    setBusy(true);
    setSubmitError(null);
    try {
      await updateExam(accessToken, examId, {
        title,
        maxScore: Number(maxScore) || 10,
        questionCount: Number(questionCount) || 10,
        variants: variantsToSave,
      });
      await reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu');
    } finally {
      setBusy(false);
    }
  };

  const handleUpsertAnswer = () => {
    if (currentVariantIndex < 0) return;
    const updatedVariants = [...localVariants];
    const existingIndex = updatedVariants[currentVariantIndex].answerKeys.findIndex(a => a.questionNumber === parsedQuestionNumber);
    
    if (existingIndex >= 0) {
      updatedVariants[currentVariantIndex].answerKeys[existingIndex].correctAnswer = correctAnswer;
    } else {
      updatedVariants[currentVariantIndex].answerKeys.push({
        questionNumber: parsedQuestionNumber,
        correctAnswer,
      });
      updatedVariants[currentVariantIndex].answerKeys.sort((a, b) => a.questionNumber - b.questionNumber);
    }
    
    setLocalVariants(updatedVariants);
    setQuestionNumber(String(parsedQuestionNumber + 1));
  };

  const handleRemoveAnswer = (qNum: number) => {
    if (currentVariantIndex < 0) return;
    const updatedVariants = [...localVariants];
    updatedVariants[currentVariantIndex].answerKeys = updatedVariants[currentVariantIndex].answerKeys.filter(a => a.questionNumber !== qNum);
    setLocalVariants(updatedVariants);
  };

  const handleAddTestCode = () => {
    const code = newCodeInput.trim().toUpperCase();
    if (!code) return;
    if (localVariants.find(v => v.testCode === code)) {
      setSubmitError('Mã đề đã tồn tại');
      return;
    }
    const updated = [...localVariants, { testCode: code, answerKeys: [] }];
    setLocalVariants(updated);
    setSelectedTestCode(code);
    setShowAddCode(false);
    setNewCodeInput('');
  };

  const handleRemoveTestCode = (code: string) => {
    if (localVariants.length <= 1) {
      setSubmitError('Phải có ít nhất 1 mã đề');
      return;
    }
    const updated = localVariants.filter(v => v.testCode !== code);
    setLocalVariants(updated);
    if (selectedTestCode === code) {
      setSelectedTestCode(updated[0].testCode);
    }
  };

  const handleCopyAnswers = (fromCode: string) => {
    if (currentVariantIndex < 0) return;
    const source = localVariants.find(v => v.testCode === fromCode);
    if (!source) return;
    
    const updatedVariants = [...localVariants];
    updatedVariants[currentVariantIndex].answerKeys = [...source.answerKeys];
    setLocalVariants(updatedVariants);
    setShowCopyCode(false);
  };

  const checkValidation = () => {
    const expectedCount = Number(questionCount) || 10;
    for (const variant of localVariants) {
      if (variant.answerKeys.length !== expectedCount) {
        return `Mã đề ${variant.testCode} chưa đủ đáp án (${variant.answerKeys.length}/${expectedCount})`;
      }
    }
    return null;
  };

  if (!examId) {
    return (
      <Screen>
        <ErrorState
          message="Không tìm thấy examId"
          retryLabel="Thử lại"
          onRetry={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <ScrollView>
        <View style={[styles.container, { paddingHorizontal: layout.horizontalPadding, paddingTop: layout.sectionGap, paddingBottom: 100, maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
          <Pressable style={styles.backRow} onPress={() => step > 1 ? setStep((step - 1) as any) : navigation.goBack()}>
            <ArrowLeft size={16} color={palette.mutedForeground} />
            <AppText variant="label" color={palette.mutedForeground}>{step > 1 ? 'Quay lại bước trước' : 'Quay lại'}</AppText>
          </Pressable>

          <View style={styles.stepperContainer}>
            <View style={[styles.stepItem, step >= 1 ? styles.stepActive : null]}>
              <AppText variant="caption" weight="bold" color={step >= 1 ? palette.primary : palette.mutedForeground}>1. Thông tin</AppText>
            </View>
            <View style={styles.stepDivider} />
            <View style={[styles.stepItem, step >= 2 ? styles.stepActive : null]}>
              <AppText variant="caption" weight="bold" color={step >= 2 ? palette.primary : palette.mutedForeground}>2. Mã đề</AppText>
            </View>
            <View style={styles.stepDivider} />
            <View style={[styles.stepItem, step >= 3 ? styles.stepActive : null]}>
              <AppText variant="caption" weight="bold" color={step >= 3 ? palette.primary : palette.mutedForeground}>3. Đáp án</AppText>
            </View>
          </View>

          {loading ? <LoadingState label="Đang tải..." /> : null}
          {error ? <ErrorState message={error} retryLabel="Thử lại" onRetry={() => void reload()} /> : null}

          {/* STEP 1 */}
          {step === 1 && (
            <View style={{ gap: appTheme.spacing.md }}>
              <AppText variant="title" weight="bold">Thông tin chung</AppText>
              <TextInputField label="Tên đề thi" value={title} onChangeText={setTitle} />
              <TextInputField label="Thang điểm (VD: 10)" value={maxScore} onChangeText={setMaxScore} keyboardType="numeric" />
              <TextInputField label="Số câu hỏi" value={questionCount} onChangeText={setQuestionCount} keyboardType="numeric" />
              
              <PrimaryButton
                label="Tiếp tục"
                onPress={() => setStep(2)}
                icon={<ChevronRight size={20} color={palette.white} />}
                style={{ marginTop: appTheme.spacing.lg }}
              />
            </View>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <View style={{ gap: appTheme.spacing.md }}>
              <AppText variant="title" weight="bold">Danh sách mã đề</AppText>
              
              <View style={{ gap: 8 }}>
                {localVariants.map((v) => (
                  <SurfaceCard key={v.testCode} style={styles.rowSpace}>
                    <AppText variant="body" weight="semibold">Mã: {v.testCode}</AppText>
                    <Pressable onPress={() => {
                      Alert.alert('Xóa mã đề', `Xóa mã đề ${v.testCode}?`, [
                        { text: 'Hủy', style: 'cancel' },
                        { text: 'Xóa', style: 'destructive', onPress: () => handleRemoveTestCode(v.testCode) },
                      ]);
                    }}>
                      <Trash2 size={16} color={palette.destructive} />
                    </Pressable>
                  </SurfaceCard>
                ))}
              </View>

              <PrimaryButton
                label="Thêm mã đề"
                onPress={() => setShowAddCode(true)}
                icon={<Plus size={20} color={palette.foreground} />}
                style={{ backgroundColor: palette.secondary }}
                textStyle={{ color: palette.foreground }}
              />

              <PrimaryButton
                label="Tiếp tục cấu hình đáp án"
                onPress={() => setStep(3)}
                icon={<ChevronRight size={20} color={palette.white} />}
                style={{ marginTop: appTheme.spacing.lg }}
              />
            </View>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <View style={{ gap: appTheme.spacing.md }}>
              <AppText variant="title" weight="bold">Cấu hình Đáp án</AppText>
              
              <View>
                <AppText variant="label" weight="semibold" style={{ marginBottom: 8 }}>Chọn mã đề</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsWrap}>
                  {localVariants.map((v) => (
                    <Pressable
                      key={v.testCode}
                      style={[styles.chip, selectedTestCode === v.testCode ? styles.chipSelected : null]}
                      onPress={() => setSelectedTestCode(v.testCode)}
                    >
                      <AppText variant="body" weight="semibold" color={selectedTestCode === v.testCode ? palette.white : palette.foreground}>
                        {v.testCode}
                      </AppText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {currentVariant && (
                <SurfaceCard style={styles.card}>
                  <View style={styles.rowSpace}>
                    <AppText variant="label" weight="semibold">Câu số</AppText>
                    {localVariants.length > 1 && (
                      <Pressable style={styles.copyButton} onPress={() => setShowCopyCode(true)}>
                        <Copy size={14} color={palette.primary} />
                        <AppText variant="caption" color={palette.primary}>Copy từ mã khác</AppText>
                      </Pressable>
                    )}
                  </View>

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

                  <PrimaryButton
                    label="Lưu câu hỏi"
                    onPress={handleUpsertAnswer}
                  />
                </SurfaceCard>
              )}

              <View style={styles.card}>
                {answerKeys.map((item) => (
                  <SurfaceCard key={item.questionNumber} style={styles.rowCard}>
                    <View style={styles.rowSpace}>
                      <AppText variant="body" weight="semibold">
                        Câu {item.questionNumber} - {item.correctAnswer}
                      </AppText>
                      <View style={styles.actionsRow}>
                        <Pressable
                          onPress={() => {
                            setQuestionNumber(String(item.questionNumber));
                            setCorrectAnswer(item.correctAnswer);
                          }}
                        >
                          <Pencil size={16} color={palette.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleRemoveAnswer(item.questionNumber)}>
                          <Trash2 size={16} color={palette.destructive} />
                        </Pressable>
                      </View>
                    </View>
                  </SurfaceCard>
                ))}
              </View>

              <View style={{ gap: appTheme.spacing.md, marginTop: appTheme.spacing.lg }}>
                {submitError ? <AppText variant="caption" color={palette.destructive}>{submitError}</AppText> : null}
                
                <PrimaryButton
                  label="Lưu bản nháp"
                  loading={busy}
                  onPress={() => saveToBackend(localVariants)}
                  style={{ backgroundColor: palette.secondary }}
                  textStyle={{ color: palette.foreground }}
                />

                <PrimaryButton
                  label="Phát hành đề"
                  loading={busy}
                  onPress={async () => {
                    const errorMsg = checkValidation();
                    if (errorMsg) {
                      setSubmitError(errorMsg);
                      return;
                    }
                    if (!accessToken) return;
                    setBusy(true);
                    setSubmitError(null);
                    try {
                      await updateExam(accessToken, examId, { 
                        title, 
                        maxScore: Number(maxScore) || 10,
                        questionCount: Number(questionCount) || 10,
                        variants: localVariants 
                      });
                      await publishExam(accessToken, examId);
                      navigation.goBack();
                    } catch (err) {
                      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  style={{ backgroundColor: palette.success }}
                />
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Modal Add Code */}
      <ModalSheet visible={showAddCode} onClose={() => setShowAddCode(false)}>
        <AppText variant="headline" weight="bold" style={{ marginBottom: 16 }}>Thêm mã đề mới</AppText>
        <TextInputField
          label="Mã đề"
          placeholder="VD: 101, 102..."
          value={newCodeInput}
          onChangeText={setNewCodeInput}
          autoCapitalize="characters"
        />
        <PrimaryButton
          label="Thêm"
          onPress={handleAddTestCode}
          style={{ marginTop: 16 }}
        />
      </ModalSheet>

      {/* Modal Copy Answers */}
      <ModalSheet visible={showCopyCode} onClose={() => setShowCopyCode(false)}>
        <AppText variant="headline" weight="bold" style={{ marginBottom: 16 }}>Sao chép đáp án</AppText>
        <AppText variant="body" color={palette.mutedForeground} style={{ marginBottom: 16 }}>
          Chọn mã đề để sao chép đáp án vào mã {selectedTestCode}
        </AppText>
        <View style={{ gap: 8 }}>
          {localVariants.filter(v => v.testCode !== selectedTestCode).map(v => (
            <Pressable
              key={v.testCode}
              style={styles.copyItem}
              onPress={() => handleCopyAnswers(v.testCode)}
            >
              <AppText variant="body" weight="semibold">Mã đề: {v.testCode}</AppText>
              <AppText variant="caption" color={palette.mutedForeground}>{v.answerKeys.length} câu</AppText>
            </Pressable>
          ))}
        </View>
        <PrimaryButton
          label="Hủy"
          onPress={() => setShowCopyCode(false)}
          style={{ marginTop: 16, backgroundColor: palette.secondary }}
          textStyle={{ color: palette.foreground }}
        />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: appTheme.spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: appTheme.spacing.sm },
  stepItem: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 16, backgroundColor: palette.secondary },
  stepActive: { backgroundColor: palette.primary + '1A' },
  stepDivider: { flex: 1, height: 1, backgroundColor: palette.border, marginHorizontal: 8 },
  card: { gap: appTheme.spacing.sm },
  chipsWrap: { flexDirection: 'row', gap: appTheme.spacing.sm, paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: appTheme.radius.md, paddingHorizontal: appTheme.spacing.md, paddingVertical: appTheme.spacing.sm, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card },
  chipSelected: { backgroundColor: palette.primary, borderColor: palette.primary },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderRadius: 4, backgroundColor: palette.primary + '1A' },
  answerRow: { flexDirection: 'row', gap: appTheme.spacing.sm },
  answerOption: { flex: 1, borderRadius: appTheme.radius.md, borderWidth: 1, borderColor: palette.border, paddingVertical: appTheme.spacing.sm, alignItems: 'center' },
  answerActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  numberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: appTheme.spacing.md },
  numberButton: { width: 46, height: 46, borderRadius: appTheme.radius.md, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.secondary },
  numberSign: { lineHeight: 24, textAlign: 'center' },
  numberInputWrap: { width: 120, height: 46, borderRadius: appTheme.radius.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.inputBackground, justifyContent: 'center', paddingHorizontal: appTheme.spacing.md },
  numberInput: { height: 46, paddingVertical: 0, color: palette.foreground, fontSize: appTheme.typography.sizes.xl, fontFamily: appTheme.typography.family, textAlign: 'center' },
  rowCard: { gap: 6 },
  rowSpace: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.md },
  copyItem: { padding: 12, borderRadius: appTheme.radius.md, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
