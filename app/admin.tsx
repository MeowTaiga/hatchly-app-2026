import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, localDateStr, type AdminStats } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

// ─── Reusable Stat Card ─────────────────────────────────────────────────────

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: string;
  index: number;
  cardStyle: object;
  valueStyle: object;
  labelStyle: object;
  subStyle: object;
}

function StatCard({ icon, iconColor, iconBg, label, value, sub, index, cardStyle, valueStyle, labelStyle, subStyle }: StatCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(400).springify()}
      style={cardStyle}
    >
      <View style={[s.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={valueStyle}>{value}</Text>
      <Text style={labelStyle}>{label}</Text>
      {sub ? <Text style={subStyle}>{sub}</Text> : null}
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  const dateDisplay = stats?.date ?? localDateStr();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20 },
        dateLabel: { ...typography.subtitle, textAlign: 'center', marginBottom: spacing.xl },
        card: {
          width: '47%',
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.sm,
        },
        statValue: { fontWeight: '800', fontSize: 28, color: colors.text, marginBottom: 2 },
        statLabel: { fontSize: 14, color: colors.textSecondary },
        statSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
        sectionTitle: {
          ...typography.subtitle, fontSize: 16,
          marginTop: spacing.xl, marginBottom: spacing.base,
        },
        toolCard: {
          flexDirection: 'row' as const, alignItems: 'center' as const,
          backgroundColor: colors.surface,
          borderRadius: radius.lg, padding: spacing.lg,
          borderWidth: 1, borderColor: colors.border,
          ...shadows.sm, gap: spacing.base, marginBottom: spacing.base,
        },
        toolCardTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
        toolCardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
        errorText: { ...typography.subtitle, color: colors.error, textAlign: 'center' as const },
        retryBtn: {
          paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
          borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.sm,
        },
        retryText: { ...typography.button, fontSize: 14 },
      }),
    [colors, typography, shadows],
  );

  return (
    <GradientBackground bubbleCount={3}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={s.backBtn} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.dateLabel}>{formatDate(dateDisplay)}</Text>

        {loading && !stats ? (
          <ActivityIndicator size="large" color={colors.primary} style={s.loader} />
        ) : error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={32} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={fetchStats} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : stats ? (
          <View style={s.grid}>
            <StatCard index={0} icon="people" iconColor="#6366F1" iconBg="rgba(99,102,241,0.12)"
              label="Total Users" value={stats.users.total} sub={`${stats.users.newToday} new today`}
              cardStyle={styles.card} valueStyle={styles.statValue} labelStyle={styles.statLabel} subStyle={styles.statSub} />
            <StatCard index={1} icon="restaurant" iconColor={colors.primary} iconBg="rgba(255,107,157,0.12)"
              label="Food Logs" value={stats.food.logs} sub={`${stats.food.totalCalories.toLocaleString()} cal`}
              cardStyle={styles.card} valueStyle={styles.statValue} labelStyle={styles.statLabel} subStyle={styles.statSub} />
            <StatCard index={2} icon="water" iconColor="#0EA5E9" iconBg="rgba(14,165,233,0.12)"
              label="Water Logs" value={stats.water.logs} sub={`${stats.water.totalOz} oz`}
              cardStyle={styles.card} valueStyle={styles.statValue} labelStyle={styles.statLabel} subStyle={styles.statSub} />
            <StatCard index={3} icon="scale" iconColor="#10B981" iconBg="rgba(16,185,129,0.12)"
              label="Weight Logs" value={stats.weight.logs}
              cardStyle={styles.card} valueStyle={styles.statValue} labelStyle={styles.statLabel} subStyle={styles.statSub} />
            <StatCard index={4} icon="trophy" iconColor="#F59E0B" iconBg="rgba(245,158,11,0.12)"
              label="Achievements" value={stats.achievements.unlocked} sub="unlocked today"
              cardStyle={styles.card} valueStyle={styles.statValue} labelStyle={styles.statLabel} subStyle={styles.statSub} />
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Tools</Text>
        <Pressable style={styles.toolCard} onPress={() => router.push('/admin-items')}>
          <View style={[s.iconCircle, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
            <Ionicons name="cube" size={22} color="#6366F1" />
          </View>
          <View style={s.toolCardBody}>
            <Text style={styles.toolCardTitle}>Game Items</Text>
            <Text style={styles.toolCardSub}>Create, edit & manage item definitions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.toolCard} onPress={() => router.push('/admin-shop-banners')}>
          <View style={[s.iconCircle, { backgroundColor: 'rgba(255,107,157,0.12)' }]}>
            <Ionicons name="storefront" size={22} color={colors.primary} />
          </View>
          <View style={s.toolCardBody}>
            <Text style={styles.toolCardTitle}>Shop Banners</Text>
            <Text style={styles.toolCardSub}>Section banners, images & display toggles</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.toolCard} onPress={() => router.push('/admin-scenes')}>
          <View style={[s.iconCircle, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <Ionicons name="image" size={22} color="#10B981" />
          </View>
          <View style={s.toolCardBody}>
            <Text style={styles.toolCardTitle}>Scenes & Scenery</Text>
            <Text style={styles.toolCardSub}>Farm scenery, custom scenes, edit & bake</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.toolCard} onPress={() => router.push('/admin-quests')}>
          <View style={[s.iconCircle, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
            <Ionicons name="flag" size={22} color="#F59E0B" />
          </View>
          <View style={s.toolCardBody}>
            <Text style={styles.toolCardTitle}>Quests</Text>
            <Text style={styles.toolCardSub}>Farm upgrades, story quests & requirements</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.toolCard} onPress={() => router.push('/admin-recipes')}>
          <View style={[s.iconCircle, { backgroundColor: 'rgba(239,83,80,0.12)' }]}>
            <Ionicons name="flame" size={22} color="#EF5350" />
          </View>
          <View style={s.toolCardBody}>
            <Text style={styles.toolCardTitle}>Recipes</Text>
            <Text style={styles.toolCardSub}>Create & manage cooking recipes</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.toolCard} onPress={() => router.push('/admin-balloon-loot')}>
          <View style={[s.iconCircle, { backgroundColor: 'rgba(168,85,247,0.12)' }]}>
            <Ionicons name="balloon" size={22} color="#A855F7" />
          </View>
          <View style={s.toolCardBody}>
            <Text style={styles.toolCardTitle}>Balloon Loot</Text>
            <Text style={styles.toolCardSub}>Configure items dropped when popping balloons</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.toolCard} onPress={() => router.push('/admin-fossil-loot')}>
          <View style={[s.iconCircle, { backgroundColor: 'rgba(139,90,43,0.12)' }]}>
            <Ionicons name="cube-outline" size={22} color="#8B5A2B" />
          </View>
          <View style={s.toolCardBody}>
            <Text style={styles.toolCardTitle}>Fossil Loot</Text>
            <Text style={styles.toolCardSub}>Configure items dropped when digging fossils</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.toolCard} onPress={() => router.push('/admin-mail')}>
          <View style={[s.iconCircle, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
            <Ionicons name="mail" size={22} color="#22C55E" />
          </View>
          <View style={s.toolCardBody}>
            <Text style={styles.toolCardTitle}>Send Mail</Text>
            <Text style={styles.toolCardSub}>Send mail to a user or broadcast to all</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </Animated.ScrollView>
    </GradientBackground>
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.base },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  toolCardBody: { flex: 1 },
  loader: { marginTop: spacing['3xl'] },
  errorBox: { alignItems: 'center', marginTop: spacing['3xl'], gap: spacing.sm },
});
