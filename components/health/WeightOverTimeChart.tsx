/**
 * Weight Over Time — journey-style progress card inspired by FarmInfo / Museum,
 * tuned for a fitness overview (clean metrics, full history support).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Polyline, Circle, Line } from 'react-native-svg';
import { useHealthPeriod } from '@/store/HealthPeriodProvider';
import { useHealthRangeData } from '@/hooks/useHealthRangeData';
import { useWeight } from '@/store/WeightProvider';
import { useTheme } from '@/store/ThemeProvider';
import { formatPeriodLabel } from '@/lib/healthPeriod';
import type { HealthPeriod } from '@/lib/healthPeriod';
import { spacing } from '@/constants/theme';

const CHART_HEIGHT = 140;
const Y_AXIS_WIDTH = 36;
const PADDING = { top: 12, right: 10, bottom: 8, left: 8 };

function formatDateLabel(dateStr: string, period: HealthPeriod): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (period === 'week') return `${weekdays[d.getDay()]} ${day}`;
  if (period === 'month') return `${d.getMonth() + 1}/${day}`;
  return `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
}

export function WeightOverTimeChart() {
  const { period } = useHealthPeriod();
  const { weightData } = useHealthRangeData(period);
  const { goalWeight, weeklyChange } = useWeight();
  const { theme } = useTheme();
  const { colors } = theme;
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(0, width - spacing.xl * 4 - Y_AXIS_WIDTH - PADDING.left - PADDING.right);

  const cardShadow = useMemo(
    () =>
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
        android: { elevation: 2 },
      }),
    [],
  );

  const { points, areaPoints, minW, maxW, yTicks, xTicks, lastPoint } = useMemo(() => {
    const { points: pts, min, max } = weightData;
    if (pts.length === 0) {
      return {
        points: '',
        areaPoints: '',
        minW: 0,
        maxW: 200,
        yTicks: [] as number[],
        xTicks: [] as { date: string; x: number }[],
        lastPoint: null as { x: number; y: number } | null,
      };
    }

    const range = max - min || 1;
    const stepX = pts.length > 1 ? chartWidth / (pts.length - 1) : 0;

    const coords = pts.map((p, i) => {
      const x = PADDING.left + i * stepX;
      const y = PADDING.top + CHART_HEIGHT - ((p.weight - min) / range) * CHART_HEIGHT;
      return { x, y, date: p.date };
    });

    const polyPts = coords.map((c) => `${c.x},${c.y}`).join(' ');
    const first = coords[0];
    const last = coords[coords.length - 1];
    const areaPts = [
      `${first.x},${PADDING.top + CHART_HEIGHT}`,
      ...coords.map((c) => `${c.x},${c.y}`),
      `${last.x},${PADDING.top + CHART_HEIGHT}`,
    ].join(' ');

    const yTickCount = 4;
    const yTicks: number[] = [];
    for (let i = 0; i <= yTickCount; i++) {
      yTicks.push(Math.round(min + (range * i) / yTickCount));
    }

    const xTickCount = period === 'week' ? 5 : period === 'month' ? 6 : 5;
    const seen = new Set<string>();
    const xTicks: { date: string; x: number }[] = [];
    for (let j = 0; j <= xTickCount; j++) {
      const idx = Math.round((j / xTickCount) * (pts.length - 1));
      if (idx >= 0 && idx < pts.length && !seen.has(pts[idx].date)) {
        seen.add(pts[idx].date);
        xTicks.push({ date: pts[idx].date, x: coords[idx].x });
      }
    }

    return {
      points: polyPts,
      areaPoints: areaPts,
      minW: min,
      maxW: max,
      yTicks,
      xTicks,
      lastPoint: last,
    };
  }, [weightData, chartWidth, period]);

  const latestWeight = weightData.latest?.weight;
  const toGo =
    goalWeight > 0 && latestWeight != null ? +(latestWeight - goalWeight).toFixed(1) : null;

  if (weightData.points.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
        <View style={[styles.glow, { backgroundColor: colors.primary + '14' }]} />
        <Text style={[styles.kicker, { color: colors.textMuted }]}>JOURNEY</Text>
        <Text style={[styles.title, { color: colors.text }]}>Weight over time</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {formatPeriodLabel(period)} · Log a weigh-in to start your curve
        </Text>
      </View>
    );
  }

  const svgWidth = chartWidth + PADDING.left + PADDING.right;
  const svgHeight = CHART_HEIGHT + PADDING.top + PADDING.bottom;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
      <View style={[styles.glow, { backgroundColor: colors.primary + '14' }]} />

      <Text style={[styles.kicker, { color: colors.textMuted }]}>JOURNEY</Text>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Weight over time</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {formatPeriodLabel(period)} · {weightData.points.length} check-ins
          </Text>
        </View>
        {latestWeight != null && (
          <View style={[styles.heroPill, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.heroValue, { color: colors.primaryText ?? colors.primary }]}>
              {latestWeight.toFixed(1)}
            </Text>
            <Text style={[styles.heroUnit, { color: colors.textSecondary }]}>lbs</Text>
          </View>
        )}
      </View>

      <View style={styles.metrics}>
        <Metric
          label="Avg"
          value={weightData.avg > 0 ? `${weightData.avg.toFixed(1)}` : '—'}
          colors={colors}
        />
        <Metric
          label="Trend"
          value={
            weightData.trend == null
              ? '—'
              : `${weightData.trend >= 0 ? '+' : ''}${weightData.trend}`
          }
          colors={colors}
          accent={
            weightData.trend == null
              ? undefined
              : weightData.trend < 0
                ? colors.success
                : weightData.trend > 0
                  ? colors.error
                  : undefined
          }
        />
        <Metric
          label="Week"
          value={weeklyChange == null ? '—' : `${weeklyChange >= 0 ? '+' : ''}${weeklyChange}`}
          colors={colors}
        />
        <Metric
          label="To goal"
          value={toGo == null ? '—' : `${toGo >= 0 ? '+' : ''}${toGo}`}
          colors={colors}
        />
      </View>

      <View style={styles.chartWrapper}>
        <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
          {yTicks.map((w, idx) => {
            const n = Math.max(yTicks.length - 1, 1);
            const top = Math.max(0, Math.min(CHART_HEIGHT - 14, (1 - idx / n) * CHART_HEIGHT - 6));
            return (
              <Text key={`${w}-${idx}`} style={[styles.axisLabel, { color: colors.textMuted, top }]} numberOfLines={1}>
                {w}
              </Text>
            );
          })}
        </View>

        <View style={styles.chartRight}>
          <Svg width={svgWidth} height={svgHeight}>
            <Defs>
              <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.28" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((t) => (
              <Line
                key={t}
                x1={PADDING.left}
                y1={PADDING.top + CHART_HEIGHT * t}
                x2={PADDING.left + chartWidth}
                y2={PADDING.top + CHART_HEIGHT * t}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            ))}
            {areaPoints ? (
              <Polyline points={areaPoints} fill="url(#weightFill)" stroke="none" />
            ) : null}
            {points ? (
              <Polyline
                points={points}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {lastPoint ? (
              <Circle cx={lastPoint.x} cy={lastPoint.y} r={4.5} fill={colors.primary} stroke={colors.surface} strokeWidth={2} />
            ) : null}
          </Svg>

          <View style={[styles.xAxis, { width: chartWidth, marginLeft: PADDING.left }]}>
            {xTicks.map(({ date }) => (
              <Text key={date} style={[styles.xAxisLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {formatDateLabel(date, period)}
              </Text>
            ))}
          </View>
        </View>
      </View>
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
  colors: { text: string; textMuted: string; textSecondary: string };
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
    alignItems: 'flex-start',
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
  heroPill: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 72,
  },
  heroValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  heroUnit: {
    fontSize: 11,
    fontWeight: '600',
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
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    marginRight: 2,
    position: 'relative',
  },
  axisLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '600',
  },
  xAxisLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartRight: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
});
