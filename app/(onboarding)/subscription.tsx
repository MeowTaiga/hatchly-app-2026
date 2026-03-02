import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { useOnboarding } from '@/store/OnboardingProvider';
import { useAuth } from '@/store/AuthProvider';
import { useSubscription, type SubscriptionPlan, type PurchaseResult } from '@/hooks/useSubscription';
import { api } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import type { AppTheme } from '@/constants/theme';
import { typography, spacing, radius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Pet Speech Bubbles ──────────────────────────────────────────────────────

const PET_MESSAGES = [
  "I wanna stay with you forever! 💕",
  "Can we be a team? Like, forever-ever? 🐾✨",
  "You make me feel all warm and glowy inside 💖",
  "Let's get better together! 💪💞",
  "I'll be your tiny hype squad every day 🥹🎉",
  "I like you already… like *a lot* 😳🌸",
  "I'll grow stronger if we stay together! 💫",
  "You're my favorite human. I checked. ✅💗",
  "I packed emotional support in my tiny paws 🧸💘",
];

// ─── Feature Highlights ──────────────────────────────────────────────────────

const FEATURES = [
  { emoji: '🐾', title: 'Your Personal Companion', desc: 'A pet that evolves as you build healthy habits' },
  { emoji: '💬', title: 'Interactive Conversations', desc: 'Chat for motivation, advice, and companionship' },
  { emoji: '💖', title: 'Feel-Good Tracking', desc: 'Positive habit tracking without guilt or shame' },
  { emoji: '🧩', title: 'Brain Games', desc: 'Crosswords, sudoku — with your pet cheering you on' },
  { emoji: '🛡️', title: 'Ad-Free Experience', desc: 'No distractions, no data selling. Just you & your pet' },
  { emoji: '⭐', title: 'Daily Motivation', desc: 'Your pet cares about your progress and celebrates wins' },
  { emoji: '🎨', title: 'Customization & Growth', desc: 'Unique accessories and traits as your pet evolves' },
] as const;

// ─── Flash Deal Config ───────────────────────────────────────────────────────

const FLASH_DEAL_DISCOUNT = 0.30;
const FLASH_DEAL_TIMER_SECONDS = 5 * 60; // 5 minutes

const SAD_PET_QUOTES = [
  "Please don't leave me behind… I have a special deal just for you!",
  "Wait… you're really leaving? I thought we were going to be best friends!",
  "But I already picked out my favorite toys for us…",
  "I promise I'll be the best companion ever! Just give me a chance?",
  "I was so excited to start our journey together…",
];

// ─── Subscription Screen ─────────────────────────────────────────────────────

function createSubscriptionStyles(theme: AppTheme) {
  const { colors, shadows } = theme;
  return StyleSheet.create({
    safe: { flex: 1 },
    petSection: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.sm, zIndex: 10 },
    bubbleContainer: { alignItems: 'center', marginBottom: -spacing.xs },
    speechBubble: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      maxWidth: SCREEN_WIDTH * 0.7,
      ...shadows.sm,
    },
    speechText: { ...typography.body, fontSize: 14, textAlign: 'center', color: colors.text },
    speechTail: {
      width: 0, height: 0,
      borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10,
      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.surface,
    },
    petContainer: {
      width: SCREEN_WIDTH * 0.3, height: SCREEN_WIDTH * 0.3,
      alignItems: 'center', justifyContent: 'center',
    },
    petImage: { width: '100%', height: '100%' },
    petFallback: { fontSize: 80 },
    petName: { ...typography.label, fontSize: 20, color: colors.primary, marginTop: spacing.xs },
    drawer: {
      flex: 1,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      marginTop: spacing.sm,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 10 },
        android: { elevation: 8 },
      }),
    },
    scrollView: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    scrollContent: { padding: spacing.xl, paddingTop: spacing['2xl'] },
    title: { ...typography.title, fontSize: 26, textAlign: 'center', marginBottom: spacing.sm, color: colors.text },
    subtitle: { ...typography.subtitle, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 22 },
    subtitleBold: { fontWeight: '600', color: colors.text },
    planRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing['2xl'] },
    planCard: { flex: 1, borderRadius: radius.xl, overflow: 'hidden', height: 150, ...shadows.md },
    planCardSelected: { transform: [{ scale: 1.02 }] },
    planGradient: { flex: 1, padding: spacing.base, alignItems: 'center', justifyContent: 'center' },
    planLabel: { ...typography.label, marginBottom: spacing.sm, color: colors.text },
    planLabelSelected: { color: colors.textInverse },
    priceRow: { flexDirection: 'row', alignItems: 'baseline' },
    planPrice: { fontSize: 24, fontWeight: '700', color: colors.text },
    planPriceSelected: { color: colors.textInverse },
    planPeriod: { fontSize: 14, marginLeft: 2, color: colors.textSecondary },
    planPeriodSelected: { color: 'rgba(255,255,255,0.8)' },
    planFootnote: { fontSize: 13, fontWeight: '500', marginTop: spacing.xs, color: colors.successDark },
    planFootnoteSelected: { color: 'rgba(255,255,255,0.9)' },
    badgeContainer: {
      position: 'absolute', top: spacing.sm,
      backgroundColor: colors.successDark,
      paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: colors.textInverse },
    featuresSection: { marginBottom: spacing.xl },
    featuresTitle: { ...typography.label, fontSize: 18, marginBottom: spacing.lg, color: colors.text },
    featureRow: { flexDirection: 'row', marginBottom: spacing.base, alignItems: 'flex-start' },
    featureEmoji: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    featureText: { flex: 1 },
    featureLabel: { ...typography.label, fontSize: 15, marginBottom: 2, color: colors.text },
    featureDesc: { ...typography.caption, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    ctaContainer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.xl, paddingTop: spacing.base,
      paddingBottom: Platform.OS === 'ios' ? spacing['2xl'] : spacing.base,
      borderTopWidth: 1, borderTopColor: colors.border,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 6 },
        android: { elevation: 6 },
      }),
    },
    ctaButton: { height: 56, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', ...shadows.md },
    ctaPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { ...typography.button, fontSize: 18 },
    disclaimer: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm, color: colors.textSecondary },
    errorText: { ...typography.caption, color: colors.error, textAlign: 'center', marginTop: spacing.md },
    warningText: { ...typography.caption, color: '#DD6B20', textAlign: 'center', marginTop: spacing.md },
  });
}

export default function SubscriptionStep() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createSubscriptionStyles(theme), [theme]);
  const { selectedPet, petCustomName, getData, reset, saveProgress } = useOnboarding();
  const { completeOnboarding, user } = useAuth();
  const {
    loading: iapLoading,
    error: iapError,
    isExpoGo,
    isIAPAvailable,
    pricing,
    purchaseSubscription,
    startTrial,
    clearError,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [processing, setProcessing] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  // ── Flash Deal State ──────────────────────────────────────────────────────
  const [showFlashDeal, setShowFlashDeal] = useState(false);
  const [hasSeenFlashDeal, setHasSeenFlashDeal] = useState(false);
  const [flashDealProcessing, setFlashDealProcessing] = useState(false);

  // ── Flash Deal Pricing ────────────────────────────────────────────────────
  const flashPricing = useMemo(() => {
    const discountedYearly = Number((pricing.yearly * (1 - FLASH_DEAL_DISCOUNT)).toFixed(2));
    const discountedMonthly = Number((pricing.monthly * (1 - FLASH_DEAL_DISCOUNT)).toFixed(2));
    const monthlyEquiv = Number((discountedYearly / 12).toFixed(2));
    return { yearly: discountedYearly, monthly: discountedMonthly, monthlyEquivalent: monthlyEquiv };
  }, [pricing]);

  // Pick a random sad quote on mount
  const sadQuote = useMemo(
    () => SAD_PET_QUOTES[Math.floor(Math.random() * SAD_PET_QUOTES.length)],
    [],
  );

  // ── Animations ───────────────────────────────────────────────────────────

  const petFloat = useSharedValue(0);
  const petScale = useSharedValue(0.9);
  const bubbleScale = useSharedValue(0);
  const featureFade = useSharedValue(0);

  // ── Persist pet draft + onboarding progress on mount ────────────────────
  const petDraftSaved = useRef(false);

  useEffect(() => {
    saveProgress('subscription');
  }, []);

  useEffect(() => {
    if (petDraftSaved.current) return;
    if (!selectedPet?.image) return;

    petDraftSaved.current = true;
    (async () => {
      try {
        console.log('[subscription] Saving pet draft to backend…');
        await api.savePetDraft({
          name: selectedPet.name,
          customName: petCustomName || selectedPet.name,
          vibe: selectedPet.vibe,
          category: selectedPet.category,
          special: selectedPet.special,
          baseColor: selectedPet.baseColor,
          secondaryColor: selectedPet.secondaryColor,
          image: selectedPet.image!,
        });
        console.log('[subscription] Pet draft saved successfully');
      } catch (err: any) {
        console.warn('[subscription] savePetDraft failed (non-blocking):', err?.message);
      }
    })();
  }, [selectedPet, petCustomName]);

  useEffect(() => {
    petFloat.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    petScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    bubbleScale.value = withDelay(400, withSpring(1, { damping: 6, stiffness: 80 }));
    featureFade.value = withDelay(600, withTiming(1, { duration: 500 }));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      bubbleScale.value = withTiming(0, { duration: 150 }, () => {
        bubbleScale.value = withSpring(1, { damping: 6, stiffness: 80 });
      });
      setMessageIndex((prev) => (prev + 1) % PET_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const petAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: petFloat.value }, { scale: petScale.value }],
  }));

  const bubbleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
    opacity: bubbleScale.value,
  }));

  const featureAnimStyle = useAnimatedStyle(() => ({
    opacity: featureFade.value,
    transform: [{ translateY: interpolate(featureFade.value, [0, 1], [20, 0]) }],
  }));

  // ── Completion Flow (shared between normal & flash deal) ──────────────────

  // Fall back to the already-persisted pet if selectedPet is null (app relaunch)
  const petImage = selectedPet?.image ?? user?.pet?.imageUrl ?? null;
  const displayName = petCustomName || selectedPet?.name || user?.pet?.customName || 'Your Buddy';

  const completeFlow = useCallback(async () => {
    // Pet was already persisted on mount via savePetDraft.
    // completeOnboarding API now sets onboardingComplete: true on the backend.
    try {
      await api.completeOnboarding(getData() as unknown as Record<string, unknown>);
    } catch (err: any) {
      console.error('[completeFlow] completeOnboarding API failed:', err?.message);
      Alert.alert(
        'Setup Issue',
        'We had trouble finishing setup. Please try again.',
      );
      throw err;
    }

    await completeOnboarding();
    reset();
    router.replace('/(tabs)');
  }, [getData, completeOnboarding, reset, router]);

  // ── Main Subscribe Handler ────────────────────────────────────────────────

  const handleSubscribe = async () => {
    if (processing) return;

    console.log('[handleSubscribe] Starting — isExpoGo:', isExpoGo, 'isIAPAvailable:', isIAPAvailable, 'plan:', selectedPlan);
    setProcessing(true);
    clearError();

    try {
      let result: PurchaseResult | 'trial' = 'error';

      if (!isExpoGo && isIAPAvailable) {
        console.log('[handleSubscribe] Attempting IAP purchase…');
        result = await purchaseSubscription(selectedPlan);
      } else {
        console.log('[handleSubscribe] Falling back to server trial…');
        const trialOk = await startTrial(selectedPlan);
        result = trialOk ? 'trial' : 'error';
      }

      console.log('[handleSubscribe] Purchase result:', result);

      if (result === 'success' || result === 'trial') {
        await completeFlow();
      } else if (result === 'cancelled' && !hasSeenFlashDeal) {
        setHasSeenFlashDeal(true);
        setShowFlashDeal(true);
      } else if (result === 'error') {
        Alert.alert(
          'Purchase Failed',
          iapError || 'Something went wrong with the purchase. Please try again.',
        );
      }
    } catch (err: any) {
      console.error('[handleSubscribe] Error:', err?.message);
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // ── Flash Deal Purchase Handler ───────────────────────────────────────────

  const handleFlashDealPurchase = async () => {
    if (flashDealProcessing) return;
    setFlashDealProcessing(true);
    clearError();

    try {
      let result: PurchaseResult | 'trial' = 'error';

      if (!isExpoGo && isIAPAvailable) {
        result = await purchaseSubscription('yearly');
      } else {
        const trialOk = await startTrial('yearly');
        result = trialOk ? 'trial' : 'error';
      }

      if (result === 'success' || result === 'trial') {
        setShowFlashDeal(false);
        await completeFlow();
      } else if (result === 'error') {
        setShowFlashDeal(false);
        Alert.alert(
          'Purchase Failed',
          iapError || 'Something went wrong with the purchase. Please try again.',
        );
      } else {
        setShowFlashDeal(false);
      }
    } catch (err: any) {
      setShowFlashDeal(false);
      Alert.alert('Error', err?.message ?? 'Something went wrong.');
    } finally {
      setFlashDealProcessing(false);
    }
  };

  const dismissFlashDeal = () => setShowFlashDeal(false);

  const isLoading = processing;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Pet + Speech Bubble Header */}
        <View style={styles.petSection}>
          <Animated.View style={[styles.bubbleContainer, bubbleAnimStyle]}>
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>{PET_MESSAGES[messageIndex]}</Text>
            </View>
            <View style={styles.speechTail} />
          </Animated.View>

          <Animated.View style={[styles.petContainer, petAnimStyle]}>
            {petImage ? (
              <CachedImage source={{ uri: petImage }} style={styles.petImage} resizeMode="contain" />
            ) : (
              <Text style={styles.petFallback}>🐣</Text>
            )}
          </Animated.View>

          <Text style={styles.petName}>{displayName}</Text>
        </View>

        {/* Scrollable Content Drawer */}
        <View style={styles.drawer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>A Better Health Journey</Text>
            <Text style={styles.subtitle}>
              You don't need another boring health app.{'\n'}
              <Text style={styles.subtitleBold}>You need a companion that makes it fun.</Text>
            </Text>

            {iapError && <Text style={styles.errorText}>{iapError}</Text>}
            {isExpoGo && (
              <Text style={styles.warningText}>In-app purchases are not available in Expo Go</Text>
            )}

            <View style={styles.planRow}>
              <PlanCard
                label="Monthly"
                price={`$${pricing.monthly}`}
                period="/mo"
                selected={selectedPlan === 'monthly'}
                onPress={() => setSelectedPlan('monthly')}
              />
              <PlanCard
                label="Annual"
                price={`$${pricing.yearly}`}
                period="/yr"
                badge={`Save ${pricing.savingsPercent}%`}
                footnote={`Just $${pricing.monthlyEquivalent}/mo`}
                selected={selectedPlan === 'yearly'}
                onPress={() => setSelectedPlan('yearly')}
              />
            </View>

            <Animated.View style={[styles.featuresSection, featureAnimStyle]}>
              <Text style={styles.featuresTitle}>What you're investing in:</Text>
              {FEATURES.map((f) => (
                <View key={f.title} style={styles.featureRow}>
                  <View style={styles.featureEmoji}>
                    <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureLabel}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </Animated.View>

            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Fixed CTA at Bottom */}
        <View style={styles.ctaContainer}>
          <Pressable
            onPress={handleSubscribe}
            disabled={isLoading}
            style={({ pressed }) => [pressed && styles.ctaPressed, isLoading && styles.ctaDisabled]}
          >
            <LinearGradient
              colors={theme.gradients.primary as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.ctaText}>Start 7-Day Free Trial</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={styles.disclaimer}>
            After trial ends, you'll be charged{' '}
            {selectedPlan === 'monthly' ? `$${pricing.monthly}/month` : `$${pricing.yearly}/year`}
          </Text>
        </View>
      </SafeAreaView>

      {/* ═══ Flash Deal Modal ═══ */}
      <Modal visible={showFlashDeal} transparent animationType="fade" statusBarTranslucent>
        <FlashDealOverlay
          petName={displayName}
          petImage={petImage ?? undefined}
          sadQuote={sadQuote}
          originalYearly={pricing.yearly}
          dealYearly={flashPricing.yearly}
          dealMonthlyEquiv={flashPricing.monthlyEquivalent}
          processing={flashDealProcessing}
          onClaim={handleFlashDealPurchase}
          onDismiss={dismissFlashDeal}
        />
      </Modal>
    </>
  );
}

// ─── Flash Deal Overlay ──────────────────────────────────────────────────────

function FlashDealOverlay({
  petName,
  petImage,
  sadQuote,
  originalYearly,
  dealYearly,
  dealMonthlyEquiv,
  processing,
  onClaim,
  onDismiss,
}: {
  petName: string;
  petImage?: string;
  sadQuote: string;
  originalYearly: number;
  dealYearly: number;
  dealMonthlyEquiv: number;
  processing: boolean;
  onClaim: () => void;
  onDismiss: () => void;
}) {
  // ── Countdown Timer ───────────────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState(FLASH_DEAL_TIMER_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const timerUrgent = secondsLeft < 60;

  // ── Animations ────────────────────────────────────────────────────────────
  const petWobble = useSharedValue(0);
  const ctaPulse = useSharedValue(1);
  const badgeRotate = useSharedValue(0);

  useEffect(() => {
    // Sad wobble for the pet
    petWobble.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 300, easing: Easing.inOut(Easing.quad) }),
        withTiming(3, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );

    // Pulsing CTA
    ctaPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );

    // Subtle badge wiggle
    badgeRotate.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 400 }),
        withTiming(2, { duration: 400 }),
      ),
      -1,
      true,
    );
  }, []);

  const petWobbleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${petWobble.value}deg` }],
  }));

  const ctaPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaPulse.value }],
  }));

  const badgeRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${badgeRotate.value}deg` }],
  }));

  return (
    <View style={fd.overlay}>
      <LinearGradient
        colors={['#0F0A1E', '#1A0F30', '#2D1045']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative floating sparkles */}
      <View style={fd.sparkleContainer} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <SparkleOrb key={i} index={i} />
        ))}
      </View>

      <SafeAreaView style={fd.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={fd.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Timer Bar */}
          <Animated.View entering={FadeIn.delay(200)}>
            <View style={[fd.timerBar, timerUrgent && fd.timerBarUrgent]}>
              <Text style={fd.timerEmoji}>⏰</Text>
              <Text style={[fd.timerText, timerUrgent && fd.timerTextUrgent]}>
                This offer expires in{' '}
                <Text style={fd.timerDigits}>{timerText}</Text>
              </Text>
            </View>
          </Animated.View>

          {/* Header */}
          <Animated.View entering={FadeIn.delay(100)} style={fd.headerSection}>
            <Text style={fd.waitText}>WAIT!</Text>
            <Text style={fd.headline}>{petName} has something to say...</Text>
          </Animated.View>

          {/* Pet + Sad Message */}
          <Animated.View entering={SlideInDown.delay(300).springify()} style={fd.petSection}>
            <Animated.View style={[fd.petImageWrapper, petWobbleStyle]}>
              {petImage ? (
                <CachedImage source={{ uri: petImage }} style={fd.petImage} resizeMode="contain" />
              ) : (
                <Text style={fd.petFallback}>🥺</Text>
              )}
              <View style={fd.sadBadge}>
                <Text style={fd.sadBadgeText}>🥺</Text>
              </View>
            </Animated.View>

            <View style={fd.quoteBubble}>
              <Text style={fd.quoteText}>"{sadQuote}"</Text>
              <View style={fd.quoteTail} />
            </View>
          </Animated.View>

          {/* Discount Badge */}
          <Animated.View entering={FadeIn.delay(500)} style={fd.discountSection}>
            <Animated.View style={[fd.discountBadge, badgeRotateStyle]}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={fd.discountBadgeGradient}
              >
                <Text style={fd.discountBadgeText}>30% OFF</Text>
              </LinearGradient>
            </Animated.View>

            <Text style={fd.exclusiveText}>EXCLUSIVE ONE-TIME OFFER</Text>
          </Animated.View>

          {/* Pricing Comparison */}
          <Animated.View entering={FadeIn.delay(600)} style={fd.pricingCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
              style={fd.pricingCardGradient}
            >
              <Text style={fd.pricingLabel}>Annual Plan</Text>

              <View style={fd.priceCompare}>
                <Text style={fd.originalPrice}>${originalYearly}</Text>
                <View style={fd.strikethrough} />
                <Text style={fd.arrowIcon}>  →  </Text>
                <Text style={fd.dealPrice}>${dealYearly}</Text>
                <Text style={fd.perYear}>/year</Text>
              </View>

              <View style={fd.savingsRow}>
                <View style={fd.savingsPill}>
                  <Text style={fd.savingsPillText}>
                    You save ${(originalYearly - dealYearly).toFixed(2)}
                  </Text>
                </View>
              </View>

              <Text style={fd.equivText}>
                That's just ${dealMonthlyEquiv}/month
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* What You Get (condensed) */}
          <Animated.View entering={FadeIn.delay(700)} style={fd.perksRow}>
            <View style={fd.perkItem}><Text style={fd.perkEmoji}>🐾</Text><Text style={fd.perkLabel}>Your Companion</Text></View>
            <View style={fd.perkItem}><Text style={fd.perkEmoji}>💬</Text><Text style={fd.perkLabel}>AI Chats</Text></View>
            <View style={fd.perkItem}><Text style={fd.perkEmoji}>🧩</Text><Text style={fd.perkLabel}>Brain Games</Text></View>
            <View style={fd.perkItem}><Text style={fd.perkEmoji}>🛡️</Text><Text style={fd.perkLabel}>No Ads</Text></View>
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeIn.delay(800)} style={fd.ctaSection}>
            <Pressable
              onPress={onClaim}
              disabled={processing}
              style={({ pressed }) => [pressed && fd.ctaPressed]}
            >
              <Animated.View style={ctaPulseStyle}>
                <LinearGradient
                  colors={['#FFD700', '#FF8C00', '#FF6B35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={fd.ctaButton}
                >
                  {processing ? (
                    <ActivityIndicator color="#1A0F30" />
                  ) : (
                    <Text style={fd.ctaText}>Claim Your 30% Off Now</Text>
                  )}
                </LinearGradient>
              </Animated.View>
            </Pressable>

            <Text style={fd.ctaSub}>
              7-day free trial included  •  Cancel anytime
            </Text>
          </Animated.View>

          {/* Dismiss */}
          <Pressable onPress={onDismiss} style={fd.dismissButton} hitSlop={16}>
            <Text style={fd.dismissText}>No thanks, I'm sure</Text>
          </Pressable>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Decorative Sparkle Orbs ─────────────────────────────────────────────────

const SparkleOrb = React.memo(function SparkleOrb({ index }: { index: number }) {
  const float = useSharedValue(0);
  const size = 4 + (index % 3) * 3;
  const left = ((index * 37) % 90) + 5;
  const top = ((index * 53) % 70) + 10;
  const opacity = 0.15 + (index % 4) * 0.1;
  const delay = index * 400;

  useEffect(() => {
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-15, { duration: 2000 + index * 300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 2000 + index * 300, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${left}%`,
          top: `${top}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#C084FC',
          opacity,
        },
        animStyle,
      ]}
    />
  );
});

// ─── Plan Card ───────────────────────────────────────────────────────────────

function PlanCard({
  label,
  price,
  period,
  badge,
  footnote,
  selected,
  onPress,
}: {
  label: string;
  price: string;
  period: string;
  badge?: string;
  footnote?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.planCard, selected && styles.planCardSelected]}>
      <LinearGradient
        colors={
          selected
            ? (theme.gradients.primary as unknown as [string, string])
            : (theme.gradients.card as [string, string])
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.planGradient}
      >
        {badge && selected && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>{label}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>{price}</Text>
          <Text style={[styles.planPeriod, selected && styles.planPeriodSelected]}>{period}</Text>
        </View>
        {footnote && (
          <Text style={[styles.planFootnote, selected && styles.planFootnoteSelected]}>{footnote}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}


// ─── Flash Deal Styles ───────────────────────────────────────────────────────

const fd = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  safe: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  sparkleContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },

  // Timer
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  timerBarUrgent: {
    backgroundColor: 'rgba(255,50,50,0.25)',
    borderColor: 'rgba(255,50,50,0.5)',
  },
  timerEmoji: { fontSize: 16, marginRight: spacing.sm },
  timerText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  timerTextUrgent: { color: '#FF6B6B' },
  timerDigits: {
    fontWeight: '800',
    fontSize: 16,
    color: '#FFD700',
    fontVariant: ['tabular-nums'],
  },

  // Header
  headerSection: { alignItems: 'center', marginBottom: spacing.md },
  waitText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,107,157,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: spacing.xs,
  },
  headline: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },

  // Pet
  petSection: { alignItems: 'center', marginBottom: spacing.lg },
  petImageWrapper: {
    width: SCREEN_WIDTH * 0.28,
    height: SCREEN_WIDTH * 0.28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  petImage: { width: '100%', height: '100%' },
  petFallback: { fontSize: 70 },
  sadBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A0F30',
    borderWidth: 2,
    borderColor: '#2D1045',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sadBadgeText: { fontSize: 16 },
  quoteBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: SCREEN_WIDTH * 0.8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quoteText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteTail: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -8,
    width: 0, height: 0,
    borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  // Discount Badge
  discountSection: { alignItems: 'center', marginBottom: spacing.lg },
  discountBadge: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  discountBadgeGradient: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  discountBadgeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A0F30',
    letterSpacing: 2,
  },
  exclusiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,215,0,0.7)',
    letterSpacing: 3,
  },

  // Pricing Card
  pricingCard: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pricingCardGradient: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  priceCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  originalPrice: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
  },
  strikethrough: {
    position: 'absolute',
    left: 0,
    width: 55,
    height: 2,
    backgroundColor: '#FF6B6B',
    transform: [{ rotate: '-8deg' }],
  },
  arrowIcon: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
  },
  dealPrice: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFD700',
  },
  perYear: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 2,
  },
  savingsRow: { marginBottom: spacing.sm },
  savingsPill: {
    backgroundColor: 'rgba(52,211,153,0.2)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
  },
  savingsPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  equivText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },

  // Condensed Perks
  perksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  perkItem: { alignItems: 'center', width: 72 },
  perkEmoji: { fontSize: 24, marginBottom: 4 },
  perkLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  // CTA
  ctaSection: { width: '100%', alignItems: 'center', marginBottom: spacing.lg },
  ctaButton: {
    height: 60,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#FFD700', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  ctaText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A0F30',
    letterSpacing: 0.5,
  },
  ctaSub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Dismiss
  dismissButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
    textDecorationLine: 'underline',
  },
});
