import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BubbleButton } from '@/components/ui/BubbleButton';
import { useOnboarding, type PetOption } from '@/store/OnboardingProvider';
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';
import { typography, spacing, radius } from '@/constants/theme';
import { darkenHex } from '@/utils/colorUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const IMAGE_SIZE = 140;

function isDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.5;
}

// ─── Pet Card (memoized, no continuous animations) ───────────────────────────

const PetCard = React.memo(function PetCard({
  pet,
  index,
  isSelected,
  onSelect,
  theme,
}: {
  pet: PetOption;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const { theme: themeCtx, themeMode } = useTheme();
  const colors = themeCtx.colors;
  const scale = useSharedValue(1);
  const textOnAccent = isDark(colors.primary) ? (colors.onPrimary ?? '#FFFFFF') : darkenHex(colors.primary, 45);
  const vibeBg = pet.baseColor || colors.surfaceElevated;
  const vibeTextColor = isDark(vibeBg) ? '#FFFFFF' : (themeMode === 'dark' ? colors.textInverse : colors.text);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardGradientColors = isSelected
    ? (theme.gradients.primary as [string, string])
    : (theme.gradients.card as [string, string]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400).springify()}>
      <Pressable onPress={onSelect} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.card,
            { borderColor: isSelected ? colors.primary : colors.border },
            theme.shadows.lg,
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={cardGradientColors}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[styles.imageArea, { backgroundColor: theme.colors.surfaceElevated }]}>
              {pet.image ? (
                <CachedImage source={{ uri: pet.image }} style={styles.petImage} resizeMode="contain" />
              ) : (
                <View style={styles.eggPlaceholder}>
                  <Text style={styles.eggEmoji}>🥚</Text>
                  <Text style={[styles.eggHint, { color: theme.colors.textSecondary }]}>Generating...</Text>
                </View>
              )}
            </View>

            <View style={styles.infoArea}>
              <Text
                style={[
                  styles.petName,
                  isSelected && { color: textOnAccent },
                  !isSelected && { color: colors.text },
                ]}
              >
                {pet.name}
              </Text>
              <View style={styles.vibeRow}>
                <View style={[styles.vibeBadge, { backgroundColor: vibeBg }]}>
                  <Text style={[styles.vibeText, { color: vibeTextColor }]}>{pet.vibe}</Text>
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && { color: textOnAccent },
                    !isSelected && { color: colors.textSecondary },
                  ]}
                >
                  {pet.category}
                </Text>
              </View>
            </View>

            {isSelected && (
              <View style={[styles.selectedOverlay, { backgroundColor: colors.primary }, theme.shadows.md]}>
                <Text style={[styles.selectedCheck, { color: textOnAccent }]}>♥</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Loading State (simplified: FadeIn + static egg) ──────────────────────────

function LoadingState() {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.loadingCenter}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.loadingEgg}>🥚</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(200).duration(400)}>
          <Text style={[styles.loadingTitle, { color: colors.text }]}>Finding your{'\n'}perfect companions...</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(400).duration(400)}>
          <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>
              Our egg experts are crafting unique{'\n'}friends just for you
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

/** Step 15: Pick your pet from 3 AI-generated options. */
export default function PetSelectionStep() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    petOptions,
    petGenLoading,
    petGenError,
    selectedPet,
    setField,
    startPetGeneration,
    personalityVibe,
    companionStyle,
  } = useOnboarding();
  const { token } = useAuth();

  const [selected, setSelected] = useState<PetOption | null>(selectedPet);

  const handleSelect = useCallback(
    (pet: PetOption) => {
      setSelected(pet);
      setField('selectedPet', pet);
    },
    [setField],
  );

  const handleContinue = useCallback(() => {
    if (selected) router.push('/(onboarding)/pet-name');
  }, [selected, router]);

  if (petGenLoading) return <LoadingState />;

  if (petGenError || petOptions.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorCenter}>
          <Text style={styles.errorEmoji}>😿</Text>
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>Oops!</Text>
          <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]}>
            {petGenError || "We couldn't find your companions. Let's try again!"}
          </Text>
          <BubbleButton
            label="Try Again"
            onPress={() => startPetGeneration(token ?? '', personalityVibe, companionStyle)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
              Meet your{'\n'}companions
            </Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(80).duration(400)}>
            <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
              They were made just for you.{'\n'}
              Who feels right?
            </Text>
          </Animated.View>

          <View style={styles.cardsContainer}>
            {petOptions.map((pet, index) => (
              <PetCard
                key={pet.name}
                pet={pet}
                index={index}
                isSelected={selected?.name === pet.name}
                onSelect={() => handleSelect(pet)}
                theme={theme}
              />
            ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <BubbleButton
          label={selected ? 'I choose you!' : 'Pick your forever friend'}
          onPress={handleContinue}
          disabled={!selected}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingEgg: { fontSize: 100, marginBottom: spacing.xl },
  loadingTitle: {
    ...typography.title,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loadingSubtext: {
    ...typography.subtitle,
    textAlign: 'center',
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.base,
  },
  errorEmoji: { fontSize: 80 },
  errorTitle: { ...typography.title, textAlign: 'center' },
  errorMessage: {
    ...typography.subtitle,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  scrollContent: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    paddingHorizontal: spacing.xl,
  },
  heroTitle: {
    ...typography.hero,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.subtitle,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  cardsContainer: {
    gap: spacing.xl,
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.xl,
    borderWidth: 3,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  imageArea: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  petImage: { width: IMAGE_SIZE - 10, height: IMAGE_SIZE - 10 },
  eggPlaceholder: { alignItems: 'center' },
  eggEmoji: { fontSize: 48 },
  eggHint: { ...typography.caption, fontSize: 10, marginTop: 4 },
  infoArea: { flex: 1 },
  petName: {
    ...typography.label,
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vibeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  vibeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryText: {
    ...typography.caption,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  selectedOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: { fontSize: 16 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.base,
    paddingTop: spacing.sm,
  },
});
