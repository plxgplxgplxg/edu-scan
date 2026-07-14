/* eslint-disable react/no-unstable-nested-components, no-void, react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listOmrExams, publishExam, updateExam, createOmrExam } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { GradientBackground } from '../../components/GradientBackground';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type AnswerKeyItem = {
  questionNumber: number;
  correctAnswer: string;
};

type VariantState = {
  testCode: string;
  answerKeys: AnswerKeyItem[];
};

const STEPS = [
  { id: 1, title: 'Thông tin' },
  { id: 2, title: 'Cấu trúc' },
  { id: 3, title: 'Đáp án' },
  { id: 4, title: 'Xác nhận' },
];

export function TeacherExamBuilderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const examId = route.params?.examId as string | undefined;
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<number>(1);

  // Step 1 states
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  // Step 2 states
  const [questionCount, setQuestionCount] = useState(40);
  const [optionsCount, setOptionsCount] = useState(4);
  const [template, setTemplate] = useState('40');
  const [testCodes, setTestCodes] = useState<string[]>(['']);

  // Step 3 states
  const [variants, setVariants] = useState<VariantState[]>([]);
  const [selectedTestCode, setSelectedTestCode] = useState<string>('');
  const [quickInput, setQuickInput] = useState('');

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, loading, error } = useAsyncResource(async () => {
    if (!accessToken || !examId) return null;
    const examsData = await listOmrExams(accessToken);
    return examsData.data.find((item) => item.id === examId) ?? null;
  }, [accessToken, examId]);

  useEffect(() => {
    if (data) {
      setTitle(data.title ?? '');
      setQuestionCount(40);
      if (data.variants && data.variants.length > 0) {
        const codes = data.variants.map(v => v.testCode === 'DEFAULT' ? '' : v.testCode);
        setTestCodes(codes);
        setVariants(data.variants.map((v) => ({
          testCode: v.testCode === 'DEFAULT' ? '' : v.testCode,
          answerKeys: [...v.answerKeys].sort((a, b) => a.questionNumber - b.questionNumber),
        })));
        setSelectedTestCode(data.variants[0].testCode === 'DEFAULT' ? '' : data.variants[0].testCode);
      } else {
        setTestCodes(['']);
        setVariants([{ testCode: '', answerKeys: [] }]);
        setSelectedTestCode('');
      }
    }
  }, [data]);

  const handleNextToStep3 = () => {
    const cleanedCodes = testCodes.map(c => c.trim());
    if (cleanedCodes.length > 1 && cleanedCodes.some(c => c === '')) {
      setSubmitError('Vui lòng nhập mã đề cho tất cả các đề hoặc xóa các mã trống.');
      return;
    }
    const uniqueCodes = new Set(cleanedCodes);
    if (uniqueCodes.size !== cleanedCodes.length) {
      setSubmitError('Các mã đề không được trùng nhau.');
      return;
    }
    setSubmitError(null);
    
    const newVariants = cleanedCodes.map(code => {
      const existing = variants.find(v => v.testCode === code);
      return existing ? existing : { testCode: code, answerKeys: [] };
    });
    setVariants(newVariants);
    if (!newVariants.find(v => v.testCode === selectedTestCode)) {
      setSelectedTestCode(newVariants[0].testCode);
    }
    setStep(3);
  };

  const handleNextToStep4 = () => {
    for (const v of variants) {
      if (v.answerKeys.length !== questionCount) {
        setSubmitError(`Mã đề ${v.testCode} chưa đủ đáp án (${v.answerKeys.length}/${questionCount})`);
        return;
      }
    }
    setSubmitError(null);
    setStep(4);
  };

  const handleSubmit = async () => {
    if (!accessToken) return;
    setBusy(true);
    setSubmitError(null);
    try {
      let targetExamId = examId;
      if (!targetExamId) {
        const created = await createOmrExam(accessToken, {
          title: title || 'Đề thi mới',
          maxScore: 10,
        });
        targetExamId = created.id;
      }
      await updateExam(accessToken, targetExamId, {
        title: title || 'Đề thi mới',
        maxScore: 10,
        questionCount,
        variants: variants.map(v => ({
          testCode: v.testCode || 'DEFAULT',
          answerKeys: v.answerKeys
        })),
      } as any);
      await publishExam(accessToken, targetExamId);
      navigation.goBack();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  const currentVariant = variants.find(v => v.testCode === selectedTestCode);
  const currentAnswers = currentVariant?.answerKeys || [];
  
  const handleQuickInputApply = () => {
    if (!currentVariant) return;
    const cleanStr = quickInput.replace(/[^a-eA-E]/g, '').toUpperCase();
    const newAnswers = [...currentVariant.answerKeys];
    
    for (let i = 0; i < cleanStr.length && i < questionCount; i++) {
      const qNum = i + 1;
      const char = cleanStr[i];
      const existingIdx = newAnswers.findIndex(a => a.questionNumber === qNum);
      if (existingIdx >= 0) {
        newAnswers[existingIdx].correctAnswer = char;
      } else {
        newAnswers.push({ questionNumber: qNum, correctAnswer: char });
      }
    }
    newAnswers.sort((a, b) => a.questionNumber - b.questionNumber);
    
    const updated = variants.map(v => v.testCode === selectedTestCode ? { ...v, answerKeys: newAnswers } : v);
    setVariants(updated);
    setQuickInput('');
  };

  const toggleAnswer = (qNum: number, ans: string) => {
    if (!currentVariant) return;
    const newAnswers = [...currentVariant.answerKeys];
    const existingIdx = newAnswers.findIndex(a => a.questionNumber === qNum);
    if (existingIdx >= 0) {
      if (newAnswers[existingIdx].correctAnswer === ans) {
        newAnswers.splice(existingIdx, 1);
      } else {
        newAnswers[existingIdx].correctAnswer = ans;
      }
    } else {
      newAnswers.push({ questionNumber: qNum, correctAnswer: ans });
    }
    newAnswers.sort((a, b) => a.questionNumber - b.questionNumber);
    const updated = variants.map(v => v.testCode === selectedTestCode ? { ...v, answerKeys: newAnswers } : v);
    setVariants(updated);
  };

  const getOptionsArray = () => {
    const arr = ['A', 'B', 'C', 'D', 'E'];
    return arr.slice(0, optionsCount);
  };

  return (
    <Screen bleedTop withoutBottomInset style={{ backgroundColor: palette.background }}>
      <GradientBackground colors={['#9b51e0', '#f472b6']} style={styles.header}>
        <View style={[styles.headerTop, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={palette.white} />
          </Pressable>
          <AppText variant="title" weight="bold" color={palette.white}>Tạo đề thi</AppText>
        </View>

        <View style={styles.stepperWrap}>
          {STEPS.map((s) => {
            const isActive = step === s.id;
            const isPast = step > s.id;
            return (
              <View key={s.id} style={styles.stepContainer}>
                <View style={[styles.stepLine, isActive || isPast ? styles.stepLineActive : null]} />
                <AppText variant="caption" weight={isActive ? 'bold' : 'normal'} color={isActive || isPast ? palette.white : 'rgba(255,255,255,0.6)'} style={{ marginTop: 6 }}>
                  {s.title}
                </AppText>
              </View>
            );
          })}
        </View>
      </GradientBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {loading && <LoadingState label="Đang tải..." />}
        {error && <ErrorState message={error} retryLabel="Thử lại" onRetry={() => void reload()} />}
        
        {step === 1 && (
          <View style={styles.stepSection}>
            <TextInputField
              label="Tên đề thi *"
              placeholder="VD: Kiểm tra 15 phút — Chương 1"
              value={title}
              onChangeText={setTitle}
            />
            <TextInputField
              label="Ghi chú"
              placeholder="Ghi chú thêm..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepSection}>
            <AppText variant="label" weight="semibold">Tổng số câu hỏi</AppText>
            <View style={styles.counterRow}>
              <Pressable style={styles.counterBtn} onPress={() => setQuestionCount(Math.max(1, questionCount - 1))}>
                <AppText variant="title" weight="bold">-</AppText>
              </Pressable>
              <View style={styles.counterValue}>
                <TextInput
                  style={{ fontSize: 24, fontWeight: 'bold', color: palette.primary, textAlign: 'center', minWidth: 48, padding: 0 }}
                  keyboardType="number-pad"
                  value={questionCount ? String(questionCount) : ''}
                  onChangeText={(text) => {
                    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(num)) {
                      setQuestionCount(Math.min(40, num));
                    } else if (text === '') {
                      setQuestionCount(0 as any);
                    }
                  }}
                  onBlur={() => {
                    if (!questionCount || questionCount < 1) setQuestionCount(1);
                  }}
                />
                <AppText variant="caption" color={palette.mutedForeground}>câu hỏi (tối đa 40)</AppText>
              </View>
              <Pressable style={styles.counterBtn} onPress={() => setQuestionCount(Math.min(40, questionCount + 1))}>
                <AppText variant="title" weight="bold">+</AppText>
              </Pressable>
            </View>

            <AppText variant="label" weight="semibold" style={{ marginTop: 16 }}>Số lựa chọn mỗi câu</AppText>
            <View style={styles.optionsRow}>
              {[2, 3, 4].map(num => (
                <Pressable
                  key={num}
                  style={[styles.optionBtn, optionsCount === num ? styles.optionBtnActive : null]}
                  onPress={() => setOptionsCount(num)}
                >
                  <AppText variant="body" weight="bold" color={optionsCount === num ? palette.white : palette.foreground}>{num}</AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="label" weight="semibold" style={{ marginTop: 16 }}>Các mã đề (để trống nếu không có mã đề)</AppText>
            <View style={{ gap: 8 }}>
              {testCodes.map((code, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInputField
                    placeholder={`Mã đề ${idx + 1}`}
                    value={code}
                    onChangeText={(txt) => {
                      const newCodes = [...testCodes];
                      newCodes[idx] = txt;
                      setTestCodes(newCodes);
                    }}
                    style={{ flex: 1, margin: 0, height: 48 }}
                    containerStyle={{ marginVertical: 0, flex: 1 }}
                  />
                  {testCodes.length > 1 && (
                    <Pressable onPress={() => {
                      const newCodes = [...testCodes];
                      newCodes.splice(idx, 1);
                      setTestCodes(newCodes);
                    }} style={{ padding: 12, backgroundColor: palette.destructive + '20', borderRadius: 12 }}>
                      <AppText weight="bold" color={palette.destructive}>Xóa</AppText>
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable onPress={() => setTestCodes([...testCodes, ''])} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.primary, borderStyle: 'dashed' }}>
                <AppText variant="title" weight="bold" color={palette.primary}>+</AppText>
                <AppText weight="bold" color={palette.primary}>Thêm mã đề</AppText>
              </Pressable>
            </View>

            <AppText variant="label" weight="semibold" style={{ marginTop: 16 }}>Mẫu phiếu trả lời</AppText>
            <View style={{ gap: 12 }}>
              {[
                { id: '40', title: '40 câu — 1 cột', desc: 'Mẫu chuẩn của EduScan (Cố định)' },
              ].map(tpl => (
                <View key={tpl.id} style={[styles.templateCard, styles.templateCardActive]}>
                  <View style={styles.templateIcon} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" weight="bold">{tpl.title}</AppText>
                    <AppText variant="caption" color={palette.mutedForeground}>{tpl.desc}</AppText>
                  </View>
                  <Check size={20} color={palette.primary} />
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepSection}>
            <View style={styles.codesScrollWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.codesScroll}>
                {variants.map(v => (
                  <Pressable 
                    key={v.testCode} 
                    style={[styles.codeChip, selectedTestCode === v.testCode ? styles.codeChipActive : null]}
                    onPress={() => setSelectedTestCode(v.testCode)}
                  >
                    <AppText variant="body" weight="bold" color={selectedTestCode === v.testCode ? palette.white : palette.primary}>
                      {v.testCode ? `Đề ${v.testCode}` : 'Đề Mặc định'}
                    </AppText>
                    {v.answerKeys.length === questionCount && <Check size={14} color={selectedTestCode === v.testCode ? palette.white : palette.success} style={{ marginLeft: 4 }} />}
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <SurfaceCard style={styles.quickInputCard}>
              <AppText variant="label" weight="semibold" color={palette.white}>Nhập nhanh chuỗi đáp án</AppText>
              <View style={styles.quickInputRow}>
                <TextInput
                  style={styles.quickInput}
                  placeholder="VD: ABCDABCD..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={quickInput}
                  onChangeText={setQuickInput}
                  autoCapitalize="characters"
                  maxLength={questionCount}
                />
                <Pressable style={styles.quickApplyBtn} onPress={handleQuickInputApply}>
                  <AppText variant="body" weight="bold" color={palette.primary}>Áp dụng</AppText>
                </Pressable>
              </View>
            </SurfaceCard>

            <View style={styles.progressRow}>
              <AppText variant="caption" color={palette.mutedForeground}>Đã điền {currentAnswers.length}/{questionCount} câu</AppText>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(currentAnswers.length / questionCount) * 100}%` }]} />
              </View>
            </View>

            <View style={styles.questionsList}>
              {Array.from({ length: questionCount }).map((_, i) => {
                const qNum = i + 1;
                const ansObj = currentAnswers.find(a => a.questionNumber === qNum);
                const selectedAns = ansObj?.correctAnswer;
                return (
                  <View key={qNum} style={styles.qRow}>
                    <AppText variant="body" weight="bold" style={styles.qNumLabel}>{qNum}.</AppText>
                    <View style={styles.qOptionsWrap}>
                      {getOptionsArray().map(opt => {
                        const isSelected = selectedAns === opt;
                        return (
                          <Pressable 
                            key={opt} 
                            style={[styles.qOptionBox, isSelected ? styles.qOptionBoxSelected : null]}
                            onPress={() => toggleAnswer(qNum, opt)}
                          >
                            <AppText variant="body" weight="bold" color={isSelected ? palette.white : palette.foreground}>{opt}</AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepSection}>
            <SurfaceCard style={styles.summaryCard}>
              <GradientBackground colors={['#9b51e0', '#f472b6']} style={styles.summaryTop}>
                <AppText variant="caption" color="rgba(255,255,255,0.8)">Đề thi mới</AppText>
                <AppText variant="title" weight="bold" color={palette.white} style={{ marginTop: 4 }}>{title || 'Chưa đặt tên'}</AppText>
                <AppText variant="body" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>{variants.length} mã đề</AppText>
              </GradientBackground>
              <View style={styles.summaryStats}>
                <View style={styles.statBox}>
                  <AppText variant="headline" weight="bold" color={palette.primary}>{questionCount}</AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>Câu hỏi</AppText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <AppText variant="headline" weight="bold" color={palette.primary}>{optionsCount}</AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>Lựa chọn</AppText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <AppText variant="headline" weight="bold" color={palette.primary}>{questionCount}</AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>Đáp án</AppText>
                </View>
              </View>
            </SurfaceCard>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {submitError ? <AppText variant="caption" color={palette.destructive} style={{ marginBottom: 8, textAlign: 'center' }}>{submitError}</AppText> : null}
        {step < 4 ? (
          <PrimaryButton 
            label="Tiếp tục" 
            onPress={() => {
              if (step === 1) {
                if (!title.trim()) {
                  setSubmitError('Vui lòng nhập tên đề thi');
                  return;
                }
                setSubmitError(null);
                setStep(2);
              } else if (step === 2) {
                handleNextToStep3();
              } else if (step === 3) {
                handleNextToStep4();
              }
            }} 
          />
        ) : (
          <PrimaryButton 
            label="Hoàn tất & Phát hành" 
            onPress={handleSubmit} 
            loading={busy}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepperWrap: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  stepContainer: {
    flex: 1,
  },
  stepLine: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  stepLineActive: {
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  stepSection: {
    gap: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  counterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    alignItems: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBtnActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 16,
  },
  templateCardActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primary + '0A',
  },
  templateIcon: {
    width: 40,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.white,
  },
  codesScrollWrap: {
    marginHorizontal: -16,
  },
  codesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: palette.secondary,
    borderWidth: 1,
    borderColor: palette.border,
  },
  codeChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  quickInputCard: {
    backgroundColor: '#b966e6',
    padding: 16,
    borderRadius: 16,
    borderWidth: 0,
    gap: 12,
  },
  quickInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    paddingHorizontal: 16,
    color: palette.white,
    fontFamily: appTheme.typography.family,
    fontSize: 16,
  },
  quickApplyBtn: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: palette.white,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: palette.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
  },
  questionsList: {
    gap: 12,
  },
  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qNumLabel: {
    width: 30,
    color: palette.mutedForeground,
  },
  qOptionsWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  qOptionBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qOptionBoxSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  summaryCard: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryTop: {
    padding: 24,
  },
  summaryStats: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: palette.white,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: palette.border,
    marginVertical: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.white,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
});
