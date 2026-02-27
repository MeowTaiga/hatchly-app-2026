import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AccentColorSectionPicker } from '@/components/ui/AccentColorSectionPicker';
import { TAB_BAR_TOTAL_HEIGHT } from '@/components/ui/FloatingTabBar';
import { COLLAPSED_HEIGHT } from '@/components/ui/PetHeroBar';
import { useTheme } from '@/store/ThemeProvider';
import { ACCENT_COLOR_SECTIONS } from '@/constants/accentColors';
import { spacing } from '@/constants/theme';

export default function ThemePickerScreen() {
  const { theme, accentColor, setAccentColor } = useTheme();
  const { colors, typography } = theme;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const st = useMemo(
    () =>
      StyleSheet.create({
        scroll: {
          paddingHorizontal: spacing.xl,
          paddingBottom: TAB_BAR_TOTAL_HEIGHT + spacing.xl,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.lg,
          marginTop: spacing.xl,
        },
        backBtn: { padding: 4, marginRight: spacing.sm },
        headerTitle: { ...typography.title, flex: 1 },
        sectionLabel: {
          fontSize: 11,
          fontWeight: '700',
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: spacing.base,
        },
      }),
    [colors, typography],
  );

  return (
    <GradientBackground bubbleCount={3}>
      <ScrollView
        contentContainerStyle={[
          st.scroll,
          { paddingTop: COLLAPSED_HEIGHT + insets.top + spacing.sm },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [st.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[st.headerTitle, { color: colors.text }]}>Accent Color</Text>
        </View>

        <Text style={st.sectionLabel}>Choose your accent color</Text>
        <AccentColorSectionPicker
          sections={ACCENT_COLOR_SECTIONS}
          selectedHex={accentColor}
          onSelect={(hex) => setAccentColor(hex)}
          selectedBorderColor={colors.surface}
          textColor={colors.text}
          sectionLabelColor={colors.textMuted}
        />
      </ScrollView>
    </GradientBackground>
  );
}
