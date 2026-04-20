import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft, Plus, Search, UserX } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { adminUsers } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { EmptyState } from '../../components/EmptyState';
import { FilterChips } from '../../components/FilterChips';
import { ModalSheet } from '../../components/ModalSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { TextInputField } from '../../components/TextInputField';
import { useAppContent } from '../../hooks/useAppContent';
import { appTheme, palette } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import type { UserRole } from '../../types/app';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RoleFilter = 'ALL' | UserRole;

export function AdminUsersScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RoleFilter>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDeactivateId, setSelectedDeactivateId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      adminUsers.filter(item => {
        const matchesSearch =
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.email.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'ALL' || item.role === filter;
        return matchesSearch && matchesFilter;
      }),
    [filter, search],
  );

  const filterItems = [
    { id: 'ALL' as const, label: content.common.labels.all },
    { id: 'ADMIN' as const, label: content.roles.ADMIN },
    { id: 'TEACHER' as const, label: content.roles.TEACHER },
    { id: 'STUDENT' as const, label: content.roles.STUDENT },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => navigation.navigate('AdminDashboard')}>
          <ArrowLeft size={16} color={palette.mutedForeground} />
          <AppText variant="label" color={palette.mutedForeground}>
            {content.common.buttons.backToHome}
          </AppText>
        </Pressable>
        <View style={styles.titleRow}>
          <AppText variant="title" weight="bold">
            {content.admin.users.title}
          </AppText>
          <Pressable style={styles.iconButton} onPress={() => setShowCreate(true)}>
            <Plus size={20} color={palette.white} />
          </Pressable>
        </View>
        <TextInputField
          label={content.common.search.users}
          value={search}
          onChangeText={setSearch}
          placeholder={content.common.search.users}
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />
        <FilterChips value={filter} items={filterItems} onChange={setFilter} />
      </View>

      <View style={styles.list}>
        {items.map(item => (
          <SurfaceCard key={item.id} style={styles.card}>
            <View style={styles.avatar}>
              <AppText variant="label" weight="bold" color={item.isActive ? palette.secondaryForeground : palette.destructive}>
                {item.name.charAt(0)}
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText variant="body" weight="medium">
                {item.name}
              </AppText>
              <AppText variant="caption" color={palette.mutedForeground}>
                {item.studentCode ? `${item.email} • ${item.studentCode}` : item.email}
              </AppText>
            </View>
            <View style={styles.userMeta}>
              <View style={styles.roleChip}>
                <AppText variant="caption" color={palette.secondaryForeground}>
                  {content.roles[item.role]}
                </AppText>
              </View>
              {item.isActive ? (
                <Pressable onPress={() => setSelectedDeactivateId(item.id)}>
                  <UserX size={16} color={palette.mutedForeground} />
                </Pressable>
              ) : (
                <View style={styles.inactiveChip}>
                  <AppText variant="caption" color={palette.destructive}>
                    {content.common.labels.inactive}
                  </AppText>
                </View>
              )}
            </View>
          </SurfaceCard>
        ))}

        {!items.length ? (
          <EmptyState title={content.common.messages.emptyUsers} />
        ) : null}
      </View>

      <ModalSheet visible={showCreate} onClose={() => setShowCreate(false)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.admin.users.createTitle}
        </AppText>
        <View style={styles.sheetBody}>
          <TextInputField
            label={content.common.form.fullName}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.personName}
          />
          <TextInputField
            label={content.common.form.email}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.email}
          />
          <TextInputField
            label={content.common.form.password}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.password}
          />
          <TextInputField
            label={content.common.form.role}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.role}
          />
          <TextInputField
            label={content.common.form.studentCode}
            value=""
            onChangeText={() => undefined}
            placeholder={content.common.placeholders.studentCode}
          />
          <PrimaryButton label={content.common.buttons.create} onPress={() => setShowCreate(false)} />
        </View>
      </ModalSheet>

      <ModalSheet visible={!!selectedDeactivateId} onClose={() => setSelectedDeactivateId(null)}>
        <AppText variant="headline" weight="bold" style={styles.sheetTitle}>
          {content.common.buttons.deactivate}
        </AppText>
        <AppText variant="body" color={palette.mutedForeground}>
          {content.common.messages.deactivateWarning}
        </AppText>
        <View style={styles.actionRow}>
          <PrimaryButton
            variant="outline"
            label={content.common.buttons.cancel}
            onPress={() => setSelectedDeactivateId(null)}
            style={styles.flex}
          />
          <PrimaryButton
            label={content.common.buttons.deactivate}
            onPress={() => setSelectedDeactivateId(null)}
            style={styles.flex}
          />
        </View>
      </ModalSheet>

      <BottomNav role="ADMIN" currentScreen="AdminUsers" currentModule="users" />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingHorizontal: appTheme.spacing.xl,
    paddingTop: appTheme.spacing.lg,
    gap: appTheme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.secondary,
  },
  flex: {
    flex: 1,
  },
  userMeta: {
    alignItems: 'flex-end',
    gap: appTheme.spacing.sm,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: appTheme.radius.sm,
    backgroundColor: palette.secondary,
  },
  inactiveChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: appTheme.radius.sm,
    backgroundColor: '#FEE2E2',
  },
  sheetTitle: {
    marginBottom: appTheme.spacing.lg,
  },
  sheetBody: {
    gap: appTheme.spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: appTheme.spacing.md,
    marginTop: appTheme.spacing.xl,
  },
});
