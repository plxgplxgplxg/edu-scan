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

import { teacherClasses } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { EmptyState } from '../../components/EmptyState';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const subjectStyles: Record<string, { backgroundColor: string; color: string }> = {
  Toán: { backgroundColor: '#E0E7FF', color: '#4338CA' },
  'Vật lý': { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  'Hoá học': { backgroundColor: '#DCFCE7', color: '#047857' },
  'Sinh học': { backgroundColor: '#FEF3C7', color: '#B45309' },
};

export function TeacherClassesScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const layout = useResponsiveLayout();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    subject: '',
    schoolYear: '2025-2026',
  });

  const filteredItems = useMemo(
    () =>
      teacherClasses.filter(item => {
        const keyword = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(keyword) ||
          item.subject.toLowerCase().includes(keyword)
        );
      }),
    [search],
  );

  return (
    <Screen>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.teacher.classes.title}
        subtitle={`${String(filteredItems.length)} ${content.teacher.classes.studentCountSuffix}`}
        gradient={['#5B5BD6', '#7C5CFC']}
        onBack={() => navigation.navigate('TeacherDashboard')}
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
        <TextInputField
          label={content.common.search.classes}
          value={search}
          onChangeText={setSearch}
          placeholder={content.common.search.classes}
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />

        {filteredItems.map(item => {
          const subjectStyle = subjectStyles[item.subject] ?? {
            backgroundColor: palette.secondary,
            color: palette.secondaryForeground,
          };

          return (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate('TeacherClassDetail', { classId: item.id })}
            >
              <SurfaceCard style={styles.classCard}>
                <View style={styles.classHeader}>
                  <View style={styles.classContent}>
                    <View
                      style={[
                        styles.subjectBadge,
                        { backgroundColor: subjectStyle.backgroundColor },
                      ]}
                    >
                      <AppText variant="caption" weight="medium" color={subjectStyle.color}>
                        {item.subject}
                      </AppText>
                    </View>
                    <AppText variant="body" weight="medium">
                      {item.name}
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

        <PrimaryButton
          variant="outline"
          label={content.teacher.classes.createTitle}
          icon={<Plus size={18} color={palette.primary} />}
          onPress={() => setShowCreate(true)}
        />
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
            onPress={() => setShowCreate(false)}
          />
        </View>
      </ModalSheet>

      <BottomNav role="TEACHER" currentScreen="TeacherClasses" currentModule="classes" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: appTheme.spacing.lg,
  },
  classCard: {
    padding: appTheme.spacing.xl,
  },
  classHeader: {
    flexDirection: 'row',
  },
  classContent: {
    gap: appTheme.spacing.sm,
    flex: 1,
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: appTheme.radius.sm,
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
