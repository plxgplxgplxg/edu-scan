import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  FileText,
  Hash,
  Lock,
  Plus,
  Search,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { teacherExams } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { EmptyState } from '../../components/EmptyState';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherExamsScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const layout = useResponsiveLayout();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');

  const items = useMemo(
    () =>
      teacherExams.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
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
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('TeacherDashboard')}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <View style={styles.titleRow}>
          <AppText variant="title" weight="bold">
            {content.teacher.exams.title}
          </AppText>
          <Pressable style={styles.iconButton} onPress={() => setShowCreate(true)}>
            <Plus size={20} color={palette.white} />
          </Pressable>
        </View>
        <TextInputField
          label={content.common.search.exams}
          value={search}
          onChangeText={setSearch}
          placeholder={content.common.search.exams}
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
        {items.map(item => (
          <SurfaceCard key={item.id} style={styles.card}>
            <View style={styles.leading}>
              <View style={styles.filePill}>
                <FileText size={22} color={palette.white} />
              </View>
              <View style={styles.flex}>
                <View style={styles.examTitleRow}>
                  <AppText variant="body" weight="medium">
                    {item.title}
                  </AppText>
                  {item.hasSubmissions ? (
                    <Lock size={13} color={palette.warning} />
                  ) : null}
                </View>
                <View style={styles.metaWrap}>
                  <View style={styles.inlineMeta}>
                    <Hash size={11} color={palette.mutedForeground} />
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${String(item.variantCount)} mã đề`}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${String(item.questionCount)} câu`}
                  </AppText>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${String(item.maxScore)} ${content.common.labels.scoreUnit}`}
                  </AppText>
                </View>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {item.classNames.join(', ')}
                </AppText>
              </View>
            </View>
          </SurfaceCard>
        ))}

        {!items.length ? (
          <EmptyState
            title={content.common.messages.emptyExams}
            icon={<FileText size={38} color={palette.mutedForeground} />}
          />
        ) : null}
      </View>

      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.common.buttons.createExam}
        </AppText>
        <TextInputField
          label={content.common.form.examTitle}
          value={title}
          onChangeText={setTitle}
          placeholder={content.common.placeholders.examTitle}
        />
        <PrimaryButton
          label={content.common.buttons.createExam}
          onPress={() => setShowCreate(false)}
          style={styles.sheetButton}
        />
      </ModalSheet>

      <BottomNav role="TEACHER" currentScreen="TeacherExams" currentModule="exams" />
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
    padding: appTheme.spacing.lg,
  },
  leading: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  filePill: {
    width: 48,
    height: 48,
    borderRadius: appTheme.radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 6,
  },
  examTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaWrap: {
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
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetButton: {
    marginTop: appTheme.spacing.lg,
  },
});
