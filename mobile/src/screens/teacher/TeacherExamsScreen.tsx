import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, FileText, Hash, Plus, Search, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createOmrExam, listClasses, listOmrExams, mapExamSummary } from '../../api/edu-scan';
import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { ModalSheet } from '../../components/ModalSheet';
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
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherExamsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const { accessToken } = useAuth();
  const layout = useResponsiveLayout();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState('10');
  const [classSearch, setClassSearch] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data, loading, error, reload } = useAsyncResource(
    async () => {
      if (!accessToken) {
        return { exams: [], classes: [] };
      }

      const [exams, classes] = await Promise.all([listOmrExams(accessToken), listClasses(accessToken)]);
      return { exams: exams.map(mapExamSummary), classes };
    },
    [accessToken],
  );

  const items = useMemo(
    () => (data?.exams ?? []).filter((item) => item.title.toLowerCase().includes(search.toLowerCase())),
    [data?.exams, search],
  );

  const classOptions = useMemo(() => {
    const keyword = classSearch.trim().toLowerCase();
    return (data?.classes ?? []).filter((item) => {
      if (!keyword) return true;
      const full = `${item.name} ${item.subject} ${item.schoolYear} ${item.code}`.toLowerCase();
      return full.includes(keyword);
    });
  }, [data?.classes, classSearch]);

  return (
    <Screen refreshing={loading} onRefresh={() => { void reload(); }}>
      <View style={[styles.header, { paddingHorizontal: layout.horizontalPadding, paddingTop: layout.sectionGap, maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('TeacherTabs', { screen: 'TeacherDashboard' })}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>{content.common.buttons.backToHome}</AppText>
        </Pressable>
        <View style={styles.titleRow}>
          <AppText variant="title" weight="bold">{content.teacher.exams.title}</AppText>
          <Pressable style={styles.iconButton} onPress={() => setShowCreate(true)}>
            <Plus size={20} color={palette.white} />
          </Pressable>
        </View>
        <TextInputField label={content.common.search.exams} value={search} onChangeText={setSearch} placeholder={content.common.search.exams} trailing={<Search size={18} color={palette.mutedForeground} />} />
      </View>

      <View style={[styles.list, { paddingHorizontal: layout.horizontalPadding, paddingTop: layout.sectionGap, maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%', gap: layout.sectionGap }]}>
        {loading ? <LoadingState label={content.common.labels.loading} /> : null}
        {error ? <ErrorState message={error} retryLabel={content.common.buttons.retry} onRetry={reload} /> : null}

        {items.map((item) => (
          <Pressable key={item.id} onPress={() => navigation.navigate('TeacherOmrExamBuilder', { examId: item.id })}>
            <SurfaceCard style={styles.card}>
              <View style={styles.leading}>
                <View style={styles.filePill}><FileText size={22} color={palette.white} /></View>
                <View style={styles.flex}>
                  <View style={styles.examTitleRow}>
                    <AppText variant="body" weight="medium">{item.title}</AppText>
                    <AppText variant="caption" color={item.status === 'PUBLISHED' ? palette.success : palette.warning}>{item.status === 'PUBLISHED' ? 'Published' : 'Draft'}</AppText>
                  </View>
                  <View style={styles.metaWrap}>
                    <View style={styles.inlineMeta}><Hash size={11} color={palette.mutedForeground} /><AppText variant="caption" color={palette.mutedForeground}>{`${String(item.variantCount)} mã đề`}</AppText></View>
                    <AppText variant="caption" color={palette.mutedForeground}>{`${String(item.questionCount)} câu`}</AppText>
                    <AppText variant="caption" color={palette.mutedForeground}>{`${String(item.maxScore)} ${content.common.labels.scoreUnit}`}</AppText>
                  </View>
                  <AppText variant="caption" color={palette.mutedForeground}>{item.classNames.length ? item.classNames.join(', ') : 'Không gán lớp'}</AppText>
                </View>
              </View>
            </SurfaceCard>
          </Pressable>
        ))}

        {!items.length ? <EmptyState title={content.common.messages.emptyExams} icon={<FileText size={38} color={palette.mutedForeground} />} /> : null}
      </View>

      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>Tạo đề thi - Bước 1</AppText>
        <TextInputField label={content.common.form.examTitle} value={title} onChangeText={setTitle} placeholder={content.common.placeholders.examTitle} />
        <TextInputField label={content.common.form.maxScore} value={maxScore} onChangeText={setMaxScore} placeholder={content.common.placeholders.maxScore} keyboardType="numeric" />

        <AppText variant="label" weight="semibold">Chọn lớp (tùy chọn)</AppText>
        <TextInputField label="Tìm lớp" value={classSearch} onChangeText={setClassSearch} placeholder="Tìm theo tên lớp hoặc mã lớp" trailing={<Search size={18} color={palette.mutedForeground} />} />

        <View style={styles.chipsWrap}>
          <Pressable style={[styles.chip, selectedClassIds.length === 0 ? styles.chipSelected : null]} onPress={() => setSelectedClassIds([])}>
            <AppText variant="caption" color={selectedClassIds.length === 0 ? palette.white : palette.foreground}>Không gán lớp</AppText>
          </Pressable>
          {classOptions.map((item) => {
            const selected = selectedClassIds.includes(item.id);
            return (
              <Pressable
                key={item.id}
                style={[styles.chip, selected ? styles.chipSelected : null]}
                onPress={() =>
                  setSelectedClassIds((current) =>
                    selected ? current.filter((id) => id !== item.id) : [...current, item.id],
                  )
                }
              >
                <AppText variant="caption" color={selected ? palette.white : palette.foreground}>{`${item.name} • ${item.subject} • ${item.schoolYear} • ${item.code}`}</AppText>
              </Pressable>
            );
          })}
        </View>

        {selectedClassIds.length > 0 ? (
          <View style={styles.selectedWrap}>
            {selectedClassIds.map((classId) => {
              const classItem = data?.classes.find((item) => item.id === classId);
              if (!classItem) return null;
              return (
                <View key={classId} style={styles.selectedItem}>
                  <AppText variant="caption" color={palette.white}>{classItem.name}</AppText>
                  <Pressable onPress={() => setSelectedClassIds((current) => current.filter((id) => id !== classId))}>
                    <X size={14} color={palette.white} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        <PrimaryButton
          label="Tạo đề và thêm câu hỏi (Bước 2)"
          loading={submitting}
          onPress={async () => {
            if (!accessToken) return;
            if (!title.trim()) {
              setSubmitError('Tên đề thi không được để trống');
              return;
            }

            setSubmitting(true);
            setSubmitError(null);
            try {
              const created = await createOmrExam(accessToken, {
                title: title.trim(),
                maxScore: Number(maxScore),
                classIds: selectedClassIds,
              });
              setShowCreate(false);
              setTitle('');
              setMaxScore('10');
              setClassSearch('');
              setSelectedClassIds([]);
              await reload();
              navigation.navigate('TeacherOmrExamBuilder', { examId: created.id });
            } catch (err) {
              setSubmitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
            } finally {
              setSubmitting(false);
            }
          }}
          style={styles.sheetButton}
        />
        {submitError ? <AppText variant="caption" color={palette.destructive}>{submitError}</AppText> : null}
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: appTheme.spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.md },
  iconButton: { width: 40, height: 40, borderRadius: appTheme.radius.md, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  list: { gap: appTheme.spacing.md },
  card: { padding: appTheme.spacing.lg },
  leading: { flexDirection: 'row', gap: appTheme.spacing.md },
  filePill: { width: 48, height: 48, borderRadius: appTheme.radius.md, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 6 },
  examTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaWrap: { flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.md, flexWrap: 'wrap' },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sheetTitle: { marginBottom: appTheme.spacing.lg },
  sheetButton: { marginTop: appTheme.spacing.lg },
  chipsWrap: { gap: appTheme.spacing.sm },
  chip: { borderRadius: appTheme.radius.md, paddingHorizontal: appTheme.spacing.md, paddingVertical: appTheme.spacing.sm, borderWidth: 1, borderColor: palette.border },
  chipSelected: { backgroundColor: palette.primary, borderColor: palette.primary },
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm },
  selectedItem: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: appTheme.radius.pill, backgroundColor: palette.primary, paddingHorizontal: appTheme.spacing.md, paddingVertical: 6 },
});
