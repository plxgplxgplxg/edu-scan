import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { appTheme, palette } from '../../theme/tokens';
import { useResponsiveLayout } from '../../theme/responsive';
import { useAuth } from '../../store/auth-store';

export function TeacherOmrProcessingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const layout = useResponsiveLayout();
  const { accessToken } = useAuth();
  
  const examId = route.params?.examId as string;
  const totalFiles = route.params?.totalFiles as number || 0;
  
  const [processed, setProcessed] = useState(0);

  // MOCK SSE: We will just fake the progress for UI purposes right now
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setProcessed(current);
      if (current >= totalFiles) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [totalFiles]);

  return (
    <Screen>
      <View style={[styles.header, { paddingHorizontal: layout.horizontalPadding }]}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
          <ArrowLeft size={24} color={palette.foreground} />
        </Pressable>
        <AppText variant="title" weight="bold" style={{ marginLeft: 8 }}>Tải ảnh lên</AppText>
      </View>
      <View style={{ flex: 1, padding: layout.horizontalPadding, alignItems: 'center' }}>
        
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(216, 75, 203, 0.8)', alignItems: 'center', justifyContent: 'center', marginTop: 40, marginBottom: 24 }}>
          <AppText variant="hero" weight="bold" color={palette.white}>{processed}/{totalFiles}</AppText>
        </View>

        <AppText variant="headline" weight="bold" style={{ marginBottom: 8 }}>Đang xử lý OMR...</AppText>
        <AppText variant="body" color={palette.mutedForeground} style={{ marginBottom: 40 }}>Vui lòng giữ ứng dụng mở</AppText>

        <View style={{ width: '100%', height: 6, backgroundColor: '#F3E8FF', borderRadius: 3, overflow: 'hidden', marginBottom: 40 }}>
          <View style={{ width: `${(processed / totalFiles) * 100}%`, height: '100%', backgroundColor: 'rgba(216, 75, 203, 0.8)' }} />
        </View>

        <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
          {Array.from({ length: totalFiles }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 16, backgroundColor: palette.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }}>
              {i < processed ? (
                <CheckCircle2 size={20} color={palette.success} />
              ) : (
                <Circle size={20} color={palette.mutedForeground} />
              )}
              <AppText variant="body" color={i < processed ? palette.foreground : palette.mutedForeground}>
                Ảnh #{i + 1} — {i < processed ? 'nhận diện thành công' : 'đang chờ xử lý...'}
              </AppText>
            </View>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
});
