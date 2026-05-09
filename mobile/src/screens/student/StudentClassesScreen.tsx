import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BookOpen,
  KeyRound,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { studentClasses } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
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

export function StudentClassesScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const layout = useResponsiveLayout();
  const [showJoin, setShowJoin] = useState(false);
  const [classCode, setClassCode] = useState('');

  return (
    <Screen>
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.student.classes.title}
        subtitle={`${String(studentClasses.length)} ${content.student.classes.activeClasses}`}
        gradient={['#5B5BD6', '#7C5CFC']}
        onBack={() => navigation.navigate('StudentDashboard')}
        leadingVisual={<BookOpen size={30} color={palette.white} />}
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
        {studentClasses.map(item => (
          <Pressable
            key={item.id}
            onPress={() => navigation.navigate('StudentClassDetail', { classId: item.id })}
          >
            <SurfaceCard style={styles.card}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    width: layout.headerVisualSize + 10,
                    height: layout.headerVisualSize + 10,
                    borderRadius: layout.heroRadius,
                  },
                ]}
              >
                <BookOpen size={22} color={palette.white} />
              </View>
              <View style={styles.flex}>
                <View style={styles.inlineRow}>
                  <View style={styles.subjectBadge}>
                    <AppText variant="caption" color={palette.secondaryForeground}>
                      {item.subject}
                    </AppText>
                  </View>
                  {(item.pendingAssignments ?? 0) > 0 ? (
                    <View style={styles.pendingBadge}>
                      <AppText variant="caption" color={palette.destructive}>
                        {`${String(item.pendingAssignments ?? 0)} ${content.student.classes.pendingAssignmentsSuffix}`}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText variant="body" weight="medium">
                  {item.name}
                </AppText>
                <View style={styles.metaRow}>
                  <View style={styles.inlineRow}>
                    <Users size={12} color={palette.mutedForeground} />
                    <AppText variant="caption" color={palette.mutedForeground}>
                      {`${String(item.studentCount)} ${content.teacher.classes.studentCountSuffix}`}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={palette.mutedForeground}>
                    {`${content.common.labels.teacher}: ${item.teacherName ?? ''}`}
                  </AppText>
                </View>
              </View>
            </SurfaceCard>
          </Pressable>
        ))}

        <PrimaryButton
          variant="outline"
          label={content.student.classes.joinNewClass}
          icon={<KeyRound size={18} color={palette.primary} />}
          onPress={() => setShowJoin(true)}
        />
      </View>

      <ModalSheet visible={showJoin} onClose={() => setShowJoin(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.student.classes.joinTitle}
        </AppText>
        <AppText variant="body" color={palette.mutedForeground} style={styles.sheetSubtitle}>
          {content.student.classes.joinSubtitle}
        </AppText>
        <TextInputField
          label={content.common.form.className}
          value={classCode}
          onChangeText={setClassCode}
          placeholder={content.common.placeholders.classCode}
        />
        <PrimaryButton
          label={content.common.buttons.joinClass}
          onPress={() => setShowJoin(false)}
          style={styles.sheetButton}
        />
      </ModalSheet>

      <BottomNav role="STUDENT" currentScreen="StudentClasses" currentModule="classes" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: appTheme.spacing.lg,
  },
  card: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  subjectBadge: {
    backgroundColor: palette.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: appTheme.radius.pill,
  },
  pendingBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: appTheme.radius.pill,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: appTheme.spacing.md,
    flexWrap: 'wrap',
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.sm,
  },
  sheetSubtitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetButton: {
    marginTop: appTheme.spacing.lg,
  },
});
