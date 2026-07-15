import React, { useState } from 'react';
import { View, Pressable, Platform, Modal, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

import { appTheme } from '../theme/tokens';
import { useResponsiveLayout } from '../theme/responsive';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

interface DateTimePickerFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DateTimePickerField({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
}: DateTimePickerFieldProps) {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState<Date>(value);
  const layout = useResponsiveLayout();

  const handlePress = () => {
    setTempDate(value);
    setShow(true);
    setMode(Platform.OS === 'ios' ? ('datetime' as any) : 'date');
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'set' && selectedDate) {
        if (mode === 'date') {
          // Continue to time picker on Android
          setTempDate(selectedDate);
          onChange(selectedDate);
          setMode('time');
          setShow(true);
        } else {
          onChange(selectedDate);
        }
      }
    } else {
      // iOS
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirmIOS = () => {
    onChange(tempDate);
    setShow(false);
  };

  const handleCancelIOS = () => {
    setShow(false);
  };

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedDate = `${pad(value.getHours())}:${pad(value.getMinutes())} ${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;

  const renderIOSModal = () => (
    <Modal visible={show} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <AppText variant="headline" weight="bold" style={styles.modalTitle}>
            Chọn thời gian
          </AppText>
          <DateTimePicker
            value={tempDate}
            mode="datetime"
            display="spinner"
            is24Hour={true}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            textColor={appTheme.palette.foreground}
            style={{ width: '100%', height: 200 }}
          />
          <View style={styles.modalActions}>
            <PrimaryButton 
              label="Huỷ" 
              variant="outline" 
              onPress={handleCancelIOS} 
              style={{ flex: 1 }} 
            />
            <View style={{ width: 12 }} />
            <PrimaryButton 
              label="Xong" 
              onPress={handleConfirmIOS} 
              style={{ flex: 1 }} 
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label" weight="semibold" style={{ color: appTheme.palette.foreground }}>
        {label}
      </AppText>
      
      <Pressable
        onPress={handlePress}
        style={[
          {
            minHeight: layout.controlMinHeight,
            paddingHorizontal: layout.isCompact ? 14 : 16,
            borderRadius: layout.heroRadius - 4,
            backgroundColor: appTheme.palette.inputBackground,
            borderWidth: 1.5,
            borderColor: 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          },
          show ? { borderColor: appTheme.palette.primary } : null,
          error ? { borderColor: appTheme.palette.destructive } : null,
        ]}
      >
        <AppText 
          style={{ 
            flex: 1, 
            color: appTheme.palette.foreground,
            paddingVertical: 14,
          }}
        >
          {formattedDate}
        </AppText>
        <Calendar size={18} color={appTheme.palette.mutedForeground} />
      </Pressable>

      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AppText variant="label" color={appTheme.palette.destructive}>
            {error}
          </AppText>
        </View>
      ) : null}

      {Platform.OS === 'ios' ? renderIOSModal() : null}
      
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={tempDate}
          mode={mode}
          display="default"
          is24Hour={true}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: appTheme.palette.background,
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    width: '100%',
  },
});
