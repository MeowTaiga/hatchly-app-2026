import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActionBannerProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent colour — tints the background and drives the palette */
  color: string;
  title: string;
  subtitle?: string;
  actionLabel: string;
  onAction: () => void;
  /** Optional badge shown above the button (e.g. "+10 XP") */
  badge?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Eye-catching, high-contrast action banner with a tinted glass look.
 * Uses the provided `color` as a saturated background wash so it pops
 * against the lighter home screen, while keeping a glassy border + shadow.
 */
export function ActionBanner({
  icon, color, title, subtitle, actionLabel, onAction, badge,
}: ActionBannerProps) {
  const { theme } = useTheme();
  const st = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: radius.lg,
          padding: 14,
          gap: 12,
          marginBottom: spacing.base,
          overflow: 'hidden',
          shadowColor: theme.colors.secondary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          elevation: 6,
        },
        glow: { borderRadius: radius.lg, borderWidth: 1.5 },
        pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
        iconBubble: {
          width: 46,
          height: 46,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        body: { flex: 1, gap: 3 },
        title: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
        subtitle: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
        right: { alignItems: 'flex-end', gap: 6 },
        badge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 9,
          paddingVertical: 3,
          borderRadius: 10,
        },
        badgeText: { fontSize: 11, fontWeight: '800' },
        actionBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: radius.full,
        },
        actionText: { fontSize: 13, fontWeight: '800', color: theme.colors.textInverse },
      }),
    [theme.colors],
  );
  return (
    <Pressable
      onPress={onAction}
      style={({ pressed }) => [
        st.container,
        { backgroundColor: `${color}18` },
        pressed && st.pressed,
      ]}
    >
      {/* Glow edge — a subtle inner border matching the accent */}
      <View style={[StyleSheet.absoluteFill, st.glow, { borderColor: `${color}30` }]} />

      {/* Icon */}
      <View style={[st.iconBubble, { backgroundColor: `${color}28` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>

      {/* Text */}
      <View style={st.body}>
        <Text style={st.title}>{title}</Text>
        {subtitle ? <Text style={st.subtitle}>{subtitle}</Text> : null}
      </View>

      {/* Right column */}
      <View style={st.right}>
        {badge ? (
          <View style={[st.badge, { backgroundColor: `${color}22` }]}>
            <Ionicons name="sparkles" size={10} color={color} />
            <Text style={[st.badgeText, { color }]}>{badge}</Text>
          </View>
        ) : null}
        <View style={[st.actionBtn, { backgroundColor: color }]}>
          <Text style={st.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textInverse} />
        </View>
      </View>
    </Pressable>
  );
}
