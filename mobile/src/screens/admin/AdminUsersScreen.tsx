import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, Search, UserX } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { adminUsers } from '../../api/mockData';
import { AppText } from '../../components/AppText';
import { BottomNav } from '../../components/BottomNav';
import { EmptyState } from '../../components/EmptyState';
import { FilterChips } from '../../components/FilterChips';
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
import type { UserRole } from '../../types/app';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RoleFilter = 'ALL' | UserRole;

export function AdminUsersScreen() {
  const navigation = useNavigation<Nav>();
  const content = useAppContent();
  const layout = useResponsiveLayout();
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
      <PageHeader
        backLabel={content.common.buttons.backToHome}
        title={content.admin.users.title}
        subtitle={content.common.search.users}
        gradient={['#4F46E5', '#7C5CFC']}
        onBack={() => navigation.navigate('AdminDashboard')}
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
          label={content.common.search.users}
          value={search}
          onChangeText={setSearch}
          placeholder={content.common.search.users}
          trailing={<Search size={18} color={palette.mutedForeground} />}
        />
        <FilterChips value={filter} items={filterItems} onChange={setFilter} />

        {items.map(item => (
          <SurfaceCard key={item.id} style={[styles.card, layout.isCompact ? styles.cardStack : null]}>
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

        <PrimaryButton
          variant="outline"
          label={content.admin.users.createTitle}
          icon={<Plus size={18} color={palette.primary} />}
          onPress={() => setShowCreate(true)}
        />
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
  list: {
    gap: appTheme.spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.spacing.md,
  },
  cardStack: {
    flexWrap: 'wrap',
    alignItems: 'flex-start',
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
    flexWrap: 'wrap',
  },
});
