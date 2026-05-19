import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { deleteClassExamQuestion, listClassExams, publishClassExam, upsertClassExamQuestion } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';

export function TeacherClassExamBuilderScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const examId = route.params?.examId as string;
  const { accessToken } = useAuth();
  const [content, setContent] = useState('');
  const [type, setType] = useState<'MULTIPLE_CHOICE' | 'ESSAY'>('MULTIPLE_CHOICE');
  const [orderIndex, setOrderIndex] = useState('1');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [answerChoice, setAnswerChoice] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const { data, reload } = useAsyncResource(async () => {
    if (!accessToken) return null;
    const items = await listClassExams(accessToken);
    return items.find((item) => item.id === examId) ?? null;
  }, [accessToken, examId]);

  return <Screen><View style={styles.wrap}>
    <Pressable style={styles.backRow} onPress={() => navigation.goBack()}><ArrowLeft size={16} color={palette.mutedForeground} /><AppText variant="label">Quay lại</AppText></Pressable>
    <AppText variant="title" weight="bold">Builder đề lớp</AppText>
    <SurfaceCard>
      <TextInputField label="Số thứ tự" value={orderIndex} onChangeText={setOrderIndex} />
      <TextInputField label="Nội dung" value={content} onChangeText={setContent} />
      <View style={styles.row}><PrimaryButton label="Trắc nghiệm" variant={type === 'MULTIPLE_CHOICE' ? 'solid' : 'outline'} onPress={() => setType('MULTIPLE_CHOICE')} /><PrimaryButton label="Tự luận" variant={type === 'ESSAY' ? 'solid' : 'outline'} onPress={() => setType('ESSAY')} /></View>
      {type === 'MULTIPLE_CHOICE' ? <><TextInputField label="A" value={optionA} onChangeText={setOptionA} /><TextInputField label="B" value={optionB} onChangeText={setOptionB} /><TextInputField label="C" value={optionC} onChangeText={setOptionC} /><TextInputField label="D" value={optionD} onChangeText={setOptionD} /><TextInputField label="Đáp án" value={answerChoice} onChangeText={(v) => setAnswerChoice((v || 'A') as 'A' | 'B' | 'C' | 'D')} /></> : null}
      <PrimaryButton label="Lưu câu hỏi" onPress={async () => {
        if (!accessToken) return;
        await upsertClassExamQuestion(accessToken, examId, { orderIndex: Number(orderIndex), type, content, optionA, optionB, optionC, optionD, answerChoice, maxScore: 1 });
        await reload();
      }} />
    </SurfaceCard>
    {(data?.classQuestions ?? []).map((q) => <SurfaceCard key={q.id}><AppText variant="body">{q.orderIndex}. {q.content}</AppText><PrimaryButton label="Xoá" variant="soft" onPress={async () => { if (!accessToken) return; await deleteClassExamQuestion(accessToken, examId, q.id); await reload(); }} /></SurfaceCard>)}
    <PrimaryButton label="Publish" onPress={async () => { if (!accessToken) return; await publishClassExam(accessToken, examId); navigation.goBack(); }} />
  </View></Screen>;
}

const styles = StyleSheet.create({ wrap: { padding: appTheme.spacing.lg, gap: appTheme.spacing.md }, backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, row: { flexDirection: 'row', gap: 8 } });
