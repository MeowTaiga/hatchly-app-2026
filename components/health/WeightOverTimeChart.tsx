/**
 * Weight Over Time Chart — line chart of weight over time.
 * Uses useHealthRangeData for period-filtered data. Shows avg and trend for weekly/monthly.
 * Y-axis: weight (lbs); X-axis: dates.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';
import { useHealthPeriod } from '@/store/HealthPeriodProvider';
import { useHealthRangeData } from '@/hooks/useHealthRangeData';
import { useTheme } from '@/store/ThemeProvider';
import { formatPeriodLabel } from '@/lib/healthPeriod';
import { spacing } from '@/constants/theme';

const CHART_HEIGHT = 120;
const Y_AXIS_WIDTH = 36;
const PADDING = { top: 8, right: 8, bottom: 28, left: 12 };

function formatDateLabel(dateStr: string, period: 'week' | 'month'): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return period === 'week' ? `${weekdays[d.getDay()]} ${day}` : `${d.getMonth() + 1}/${day}`;
}

export function WeightOverTimeChart() {
  const { period } = useHealthPeriod();
  const { weightData } = useHealthRangeData(period);
  const { theme } = useTheme();
  const { colors, typography } = theme;
  const { width } = useWindowDimensions();
  // Account for scroll padding + card padding on each side
  const chartWidth = Math.max(0, width - spacing.xl * 4 - Y_AXIS_WIDTH - PADDING.left - PADDING.right);

  const { points, minW, maxW, yTicks, xTicks } = useMemo(() => {
    const { points: pts, min, max } = weightData;
    if (pts.length === 0) return { points: '', minW: 0, maxW: 200, yTicks: [] as number[], xTicks: [] as { date: string }[] };

    const range = max - min || 1;
    const stepX = pts.length > 1 ? chartWidth / (pts.length - 1) : 0;

    const polyPts = pts
      .map((p, i) => {
        const x = PADDING.left + i * stepX;
        const y = PADDING.top + CHART_HEIGHT - ((p.weight - min) / range) * CHART_HEIGHT;
        return `${x},${y}`;
      })
      .join(' ');

    const yTickCount = 4;
    const yTicks: number[] = [];
    for (let i = 0; i <= yTickCount; i++) {
      yTicks.push(Math.round(min + (range * i) / yTickCount));
    }

    const xTickCount = period === 'week' ? 5 : 6;
    const seen = new Set<string>();
    const xTicks: { date: string }[] = [];
    for (let j = 0; j <= xTickCount; j++) {
      const idx = Math.round((j / xTickCount) * (pts.length - 1));
      if (idx >= 0 && idx < pts.length && !seen.has(pts[idx].date)) {
        seen.add(pts[idx].date);
        xTicks.push({ date: pts[idx].date });
      }
    }

    return { points: polyPts, minW: min, maxW: max, yTicks, xTicks };
  }, [weightData, chartWidth, period]);

  if (weightData.points.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface + 'CC' }]}>
        <Text style={[styles.title, typography.label, { color: colors.text }]}>Weight Over Time</Text>
        <Text style={[styles.subtitle, typography.subtitle, { color: colors.textSecondary }]}>
          {formatPeriodLabel(period)}
        </Text>
        <Text style={[styles.empty, typography.subtitle, { color: colors.textMuted }]}>
          Log your weight to see your progress
        </Text>
      </View>
    );
  }

  const svgWidth = chartWidth + PADDING.left + PADDING.right;
  const svgHeight = CHART_HEIGHT + PADDING.top + PADDING.bottom;

  const summaryParts: string[] = [];
  if (weightData.avg > 0) summaryParts.push(`Avg: ${weightData.avg.toFixed(1)} lbs`);
  if (weightData.trend !== null) {
    const sign = weightData.trend >= 0 ? '+' : '';
    summaryParts.push(`Trend: ${sign}${weightData.trend} lbs`);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface + 'CC' }]}>
      <Text style={[styles.title, typography.label, { color: colors.text }]}>Weight Over Time</Text>
      <Text style={[styles.subtitle, typography.subtitle, { color: colors.textSecondary }]}>
        {formatPeriodLabel(period)}
        {summaryParts.length > 0 ? ` · ${summaryParts.join(' · ')}` : ''}
      </Text>

      <View style={styles.chartWrapper}>
        {/* Y-axis labels (left) — max at top, min at bottom (matches chart: higher weight = higher position) */}
        <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
          {yTicks.map((w, idx) => {
            const n = Math.max(yTicks.length - 1, 1);
            const top = Math.max(0, Math.min(CHART_HEIGHT - 14, (1 - idx / n) * CHART_HEIGHT - 6));
            return (
              <Text
                key={`${w}-${idx}`}
                style={[styles.axisLabel, { color: colors.textMuted, top }]}
                numberOfLines={1}
              >
                {w} lbs
              </Text>
            );
          })}
        </View>

        <View style={styles.chartRight}>
          <Svg width={svgWidth} height={svgHeight} style={styles.svg}>
            <Line
              x1={PADDING.left}
              y1={PADDING.top}
              x2={PADDING.left}
              y2={PADDING.top + CHART_HEIGHT}
              stroke={colors.border}
              strokeWidth={1}
            />
            <Line
              x1={PADDING.left}
              y1={PADDING.top + CHART_HEIGHT}
              x2={PADDING.left + chartWidth}
              y2={PADDING.top + CHART_HEIGHT}
              stroke={colors.border}
              strokeWidth={1}
            />
            {points && (
              <Polyline
                points={points}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>

          {/* X-axis labels (bottom) */}
          <View style={[styles.xAxis, { width: chartWidth, marginLeft: PADDING.left }]}>
            {xTicks.map(({ date }) => (
              <Text
                key={date}
                style={[styles.xAxisLabel, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {formatDateLabel(date, period)}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.base,
  },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: 12, fontSize: 13 },
  empty: { lineHeight: 22, marginTop: 4 },
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
    fontWeight: '500',
  },
  xAxisLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  chartRight: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  svg: { maxWidth: '100%' },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
});
