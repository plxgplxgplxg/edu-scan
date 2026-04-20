import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ArrowLeft,
  ImageIcon,
  ScanLine,
  Upload,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { omrBatches } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { ModalSheet } from '../../components/ModalSheet';
import { PageHeader } from '../../components/PageHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TeacherOmrScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const [showUpload, setShowUpload] = useState(false);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('TeacherDashboard')}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <AppText variant="title" weight="bold">
          {content.teacher.omr.title}
        </AppText>
      </View>

      <View style={styles.body}>
        <Pressable onPress={() => setShowUpload(true)}>
          <SurfaceCard style={styles.heroCard}>
            <View style={styles.uploadIcon}>
              <Upload size={26} color={palette.white} />
            </View>
            <View style={styles.flex}>
              <AppText variant="body" weight="semibold" color={palette.white}>
                {content.teacher.omr.uploadTitle}
              </AppText>
              <AppText variant="label" color="rgba(255,255,255,0.76)">
                {`${content.teacher.omr.uploadSubtitle} • ${content.common.messages.uploadHint}`}
              </AppText>
            </View>
          </SurfaceCard>
        </Pressable>

        <AppText variant="headline" weight="semibold">
          {content.teacher.omr.historyTitle}
        </AppText>
        {omrBatches.map(batch => (
          <SurfaceCard key={batch.id} style={styles.batchCard}>
            <View style={styles.batchHead}>
              <View style={styles.flex}>
                <AppText variant="body" weight="medium">
                  {batch.examTitle}
                </AppText>
                <AppText variant="caption" color={palette.mutedForeground}>
                  {batch.createdAt}
                </AppText>
              </View>
              <StatusBadge status={batch.status} />
            </View>
            <ProgressBar
              progress={batch.progressPercentage}
              color={batch.status === 'COMPLETED' ? palette.success : palette.primary}
            />
            <View style={styles.batchMeta}>
              <AppText variant="caption" color={palette.mutedForeground}>
                {`${String(batch.successCount)} thành công • ${String(batch.failedCount)} lỗi • ${String(batch.totalFiles)} tổng`}
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground}>
                {`${String(batch.progressPercentage)}%`}
              </AppText>
            </View>
          </SurfaceCard>
        ))}
      </View>

      <ModalSheet visible={showUpload} onClose={() => setShowUpload(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.teacher.omr.uploadTitle}
        </AppText>
        <SurfaceCard style={styles.dropZone}>
          <ImageIcon size={40} color={palette.primary} />
          <AppText variant="body" weight="medium" style={styles.center}>
            {content.teacher.omr.selectImages}
          </AppText>
          <AppText variant="caption" color={palette.mutedForeground} style={styles.center}>
            {content.common.messages.uploadHint}
          </AppText>
        </SurfaceCard>
        <PrimaryButton
          label={content.common.buttons.startScan}
          icon={<ScanLine size={18} color={palette.white} />}
          onPress={() => setShowUpload(false)}
          style={styles.sheetButton}
        />
      </ModalSheet>

      <BottomNav role="TEACHER" currentScreen="TeacherOMR" currentModule="omr" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: 56,
    gap: appTheme.spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  body: {
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
  },
  heroCard: {
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.lg,
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: appTheme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  batchCard: {
    gap: appTheme.spacing.md,
  },
  batchHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: appTheme.spacing.md,
  },
  batchMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: appTheme.spacing.md,
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  dropZone: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(91,91,214,0.25)',
    backgroundColor: '#F9F9FF',
    gap: appTheme.spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
  sheetButton: {
    marginTop: appTheme.spacing.lg,
  },
});
