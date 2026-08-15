/**
 * Goal overview — hatch rate over the health week / month / all-time range.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useHealthPeriod } from '@/store/HealthPeriodProvider';
import { useGoals } from '@/store/GoalsProvider';
import { useTheme } from '@/store/ThemeProvider';
import { api, type GoalHistoryDay, type GoalHistoryState } from '@/lib/api';
import { formatPeriodLabel, getDateRange, type HealthPeriod } from '@/lib/healthPeriod';
import { spacing } from '@/constants/theme';

const RING_SIZE = 78;
const STROKE = 7;
const R = (RING_SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const BAR_MAX = 56;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const EMPTY: GoalHistoryState = {
  start: '',
  end: '',
  days: [],
  due: 0,
  completed: 0,
  daysWithGoals: 0,
  perfectDays: 0,
  showUpDays: 0,
  streak: 0,
  bestStreak: 0,
  rate: 0,
};

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeForPeriod(period: HealthPeriod): { start: string; end: string } {
  if (period !== 'all') return getDateRange(period);
  const now = new Date();
  const end = formatLocalDate(now);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 364);
  return { start: formatLocalDate(startDate), end };
}

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function monthDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

type ChartBar = {
  key: string;
  rate: number;
  perfect: boolean;
  due: number;
  label: string;
};

function toBars(days: GoalHistoryDay[], period: HealthPeriod): ChartBar[] {
  const asBar = (day: GoalHistoryDay, label: string): ChartBar => ({
    key: day.date,
    rate: day.due > 0 ? day.completed / day.due : 0,
    perfect: day.due > 0 && day.completed >= day.due,
    due: day.due,
    label,
  });

  if (period === 'week') {
    return days.map((day) => asBar(day, WEEKDAYS[weekdayOf(day.date)] ?? ''));
  }

  if (period === 'month' || days.length <= 35) {
    return days.map((day, i) => {
      const show = i === 0 || i === days.length - 1 || i % 7 === 0;
      return asBar(day, show ? monthDay(day.date) : '');
    });
  }

  const target = 24;
  const chunk = Math.ceil(days.length / target);
  const bars: ChartBar[] = [];
  for (let i = 0; i < days.length; i += chunk) {
    const slice = days.slice(i, i + chunk);
    const due = slice.reduce((s, d) => s + d.due, 0);
    const completed = slice.reduce((s, d) => s + d.completed, 0);
    const first = slice[0];
    const last = slice[slice.length - 1];
    bars.push({
      key: `${first.date}:${last.date}`,
      rate: due > 0 ? completed / due : 0,
      perfect: due > 0 && completed >= due,
      due,
      label: i === 0 || i + chunk >= days.length ? monthDay(first.date) : '',
    });
  }
  return bars;
}

function flavor(history: GoalHistoryState, period: HealthPeriod): string {
  if (history.daysWithGoals === 0) {
    return 'Check off a goal and watch this nest fill up';
  }
  if (history.rate >= 1) {
    return period === 'week' ? 'A perfect week — every egg hatched' : 'Every goal landed. Legendary.';
  }
  if (history.streak >= 5) {
    return `${history.streak}-day streak — your pet is glowing`;
  }
  if (history.rate >= 0.8) return 'On a roll — the nest is toasty';
  if (history.rate >= 0.5) return 'Warming up — keep pecking away';
  if (history.rate >= 0.25) return 'First pecks — habits start small';
  return 'Eggs waiting — one check starts the hatch';
}

interface GoalOverviewCardProps {
  onPress?: () => void;
}

export function GoalOverviewCard({ onPress }: GoalOverviewCardProps) {
  const { period } = useHealthPeriod();
  const { state, isLoaded } = useGoals();
  const { theme } = useTheme();
  const { colors } = theme;
  const [history, setHistory] = useState<GoalHistoryState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const { start, end } = useMemo(() => rangeForPeriod(period), [period]);

  const refresh = useCallback(async () => {
    try {
      setHistory(await api.getGoalHistory(start, end));
    } catch {
      setHistory(EMPTY);
    } finally {
      setLoaded(true);
    }
  }, [start, end]);

  useEffect(() => {
    void refresh();
  }, [refresh, state.completedCount, state.dueCount, state.dateStr]);

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  const bars = useMemo(() => toBars(history.days, period), [history.days, period]);
  const pct = Math.round(history.rate * 100);
  const offset = C * (1 - Math.min(history.rate, 1));
  const line = flavor(history, period);
  const accent = colors.primaryText ?? colors.primary;

  const body = (
    <>
      <View style={[styles.glow, { backgroundColor: colors.primary + '14' }]} />
      <Text style={[styles.kicker, { color: colors.textMuted }]}>HATCH RATE</Text>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Goal overview</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {formatPeriodLabel(period)}
            {history.daysWithGoals > 0 ? ` · ${history.perfectDays} perfect day${history.perfectDays === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              stroke={colors.border}
              strokeWidth={STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              stroke={colors.primary}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${C} ${C}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringValue, { color: accent }]}>
              {history.daysWithGoals > 0 ? `${pct}%` : '—'}
            </Text>
            <Text style={[styles.ringUnit, { color: colors.textMuted }]}>hatched</Text>
          </View>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label="Hit" value={history.daysWithGoals > 0 ? `${pct}%` : '—'} colors={colors} />
        <Metric label="Perfect" value={String(history.perfectDays)} colors={colors} />
        <Metric
          label="Streak"
          value={history.streak > 0 ? `${history.streak}d` : '—'}
          colors={colors}
          accent={history.streak > 0 ? colors.successDark ?? colors.success : undefined}
        />
        <Metric label="Best" value={history.bestStreak > 0 ? `${history.bestStreak}d` : '—'} colors={colors} />
      </View>

      {bars.length > 0 ? (
        <View style={styles.chart}>
          <View style={styles.barRow}>
            {bars.map((bar) => {
              const h = bar.due <= 0 ? 4 : Math.max(6, Math.round(bar.rate * BAR_MAX));
              const fill =
                bar.due <= 0
                  ? colors.border
                  : bar.perfect
                    ? colors.successDark ?? colors.success
                    : colors.primary;
              return (
                <View key={bar.key} style={styles.barCol}>
                  <View style={[styles.barTrack, { height: BAR_MAX }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: h,
                          backgroundColor: fill,
                          opacity: bar.due <= 0 ? 0.45 : bar.perfect ? 1 : 0.55 + bar.rate * 0.45,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.xAxis}>
            {bars.map((bar) => (
              <Text key={`l-${bar.key}`} style={[styles.xLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {bar.label}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Ionicons name="sparkles" size={14} color={accent} />
        <Text style={[styles.flavor, { color: colors.textSecondary }]}>{line}</Text>
        {onPress ? <Ionicons name="chevron-forward" size={14} color={colors.textMuted} /> : null}
      </View>
    </>
  );

  if (!isLoaded && !loaded) return null;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          cardShadow,
          pressed && { opacity: 0.92 },
        ]}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
      {body}
    </View>
  );
}

function Metric({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value: string;
  colors: { text: string; textMuted: string };
  accent?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent ?? colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -60,
    right: -40,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  ringUnit: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: -1,
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metric: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(127,127,127,0.08)',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  chart: {
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: BAR_MAX,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    maxWidth: 18,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '70%',
    minWidth: 4,
    borderRadius: 4,
  },
  xAxis: {
    flexDirection: 'row',
    marginTop: 6,
  },
  xLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flavor: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
