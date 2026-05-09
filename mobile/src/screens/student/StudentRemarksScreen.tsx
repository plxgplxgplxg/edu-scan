import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { studentRemarks } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { formatVietnameseDate } from '../../utils/format';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StudentRemarksScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const layout = useResponsiveLayout();
  const [showCreate, setShowCreate] = useState(false);

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
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('StudentDashboard')}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <View style={styles.titleRow}>
          <AppText variant="title" weight="bold">
            {content.student.remarks.title}
          </AppText>
          <Pressable style={styles.iconButton} onPress={() => setShowCreate(true)}>
            <Plus size={20} color={palette.white} />
          </Pressable>
        </View>
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
        {studentRemarks.map(item => (
          <SurfaceCard key={item.id} style={styles.card}>
            <View style={[styles.rowBetween, layout.isCompact ? styles.rowWrap : null]}>
              <View style={styles.flex}>
                <AppText variant="body" weight="medium">
                  {item.examTitle}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {`${content.common.labels.question} ${String(item.questionNumber)} • ${formatVietnameseDate(item.createdAt)}`}
                </AppText>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <SurfaceCard style={styles.reasonCard}>
              <AppText variant="caption" color={palette.mutedForeground}>
                {content.student.remarks.reasonTitle}
              </AppText>
              <AppText variant="body">{item.reason}</AppText>
            </SurfaceCard>
            {item.teacherComment ? (
              <SurfaceCard style={styles.commentCard}>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {content.student.remarks.teacherComment}
                </AppText>
                <AppText
                  variant="body"
                  color={item.status === 'APPROVED' ? palette.success : palette.destructive}
                >
                  {item.teacherComment}
                </AppText>
              </SurfaceCard>
            ) : null}
          </SurfaceCard>
        ))}
      </View>

      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.student.remarks.createTitle}
        </AppText>
        <View style={styles.sheetBody}>
          <TextInputField
            label={content.common.form.exam}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.examTitle}
          />
          <TextInputField
            label={content.common.form.questionNumber}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.questionNumber}
          />
          <TextInputField
            label={content.common.form.reason}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.remarkReason}
          />
          <PrimaryButton
            label={content.common.buttons.sendRequest}
            onPress={() => setShowCreate(false)}
          />
        </View>
      </ModalSheet>

      <BottomNav role="STUDENT" currentScreen="StudentRemarks" currentModule="remarks" />
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
    gap: appTheme.spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
  },
  rowWrap: {
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  reasonCard: {
    backgroundColor: palette.inputBackground,
    gap: 4,
  },
  commentCard: {
    gap: 4,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetBody: {
    gap: appTheme.spacing.lg,
  },
});
