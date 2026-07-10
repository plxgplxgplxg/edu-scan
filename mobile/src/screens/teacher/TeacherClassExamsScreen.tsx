import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, FileText, Plus, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createClassExam, listClassExams, listClasses, mapExamSummary } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useAuth } from '../../store/auth-store';
import { appTheme, palette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherClassExamsScreen() {
  const navigation = useNavigation<Nav>();
  const { accessToken } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const { data, loading, error, reload } = useAsyncResource(async () => {
    if (!accessToken) return { exams: [], classes: [] };
    const [exams, classes] = await Promise.all([listClassExams(accessToken), listClasses(accessToken)]);
    return { exams: exams.map(mapExamSummary), classes };
  }, [accessToken]);

  const items = useMemo(() => (data?.exams ?? []).filter((item) => item.title.toLowerCase().includes(search.toLowerCase())), [data?.exams, search]);

  return <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
    <View style={styles.wrap}>
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}><ArrowLeft size={16} color={palette.mutedForeground} /><AppText variant="label">Quay lại</AppText></Pressable>
      <View style={styles.row}><AppText variant="title" weight="bold">Đề lớp học</AppText><Pressable style={styles.add} onPress={() => setShowCreate(true)}><Plus size={18} color={palette.white} /></Pressable></View>
      <TextInputField label="Tìm đề" value={search} onChangeText={setSearch} placeholder="Tìm đề" trailing={<Search size={16} color={palette.mutedForeground} />} />
      {loading ? <LoadingState label="Đang tải..." /> : null}
      {error ? <ErrorState message={error} retryLabel="Thử lại" onRetry={reload} /> : null}
      {items.map((item) => <Pressable key={item.id} onPress={() => navigation.navigate('TeacherClassExamBuilder', { examId: item.id })}><SurfaceCard><AppText variant="body" weight="medium">{item.title}</AppText></SurfaceCard></Pressable>)}
      {!items.length ? <EmptyState title="Chưa có đề lớp" icon={<FileText size={24} color={palette.mutedForeground} />} /> : null}
    </View>
    <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
      <TextInputField label="Tiêu đề" value={title} onChangeText={setTitle} placeholder="Nhập tiêu đề" />
      <View style={styles.chips}>{(data?.classes ?? []).map((item) => <Pressable key={item.id} style={[styles.chip, selectedClassIds.includes(item.id) ? styles.chipOn : null]} onPress={() => setSelectedClassIds((curr) => curr.includes(item.id) ? curr.filter((id) => id !== item.id) : [...curr, item.id])}><AppText variant="caption" color={selectedClassIds.includes(item.id) ? palette.white : palette.foreground}>{item.name}</AppText></Pressable>)}</View>
      <PrimaryButton label="Tạo đề lớp" onPress={async () => {
        if (!accessToken || !title.trim() || selectedClassIds.length === 0) return;
        const created = await createClassExam(accessToken, { title: title.trim(), maxScore: 10, classIds: selectedClassIds });
        await reload();
        setShowCreate(false);
        navigation.navigate('TeacherClassExamBuilder', { examId: created.id });
      }} />
    </ModalSheet>
  </Screen>;
}

const styles = StyleSheet.create({ wrap: { padding: appTheme.spacing.lg, gap: appTheme.spacing.md }, backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, add: { width: 36, height: 36, borderRadius: 8, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' }, chips: { gap: 8 }, chip: { borderWidth: 1, borderColor: palette.border, borderRadius: 8, padding: 8 }, chipOn: { backgroundColor: palette.primary, borderColor: palette.primary } });
