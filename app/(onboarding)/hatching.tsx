import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/store/OnboardingProvider';
import { useTheme } from '@/store/ThemeProvider';
import { typography, spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Particle System ────────────────────────────────────────────────────────

const PARTICLE_EMOJIS = ['✨', '💫', '⭐', '🌟', '💖', '🎉', '🌸', '💜'];

interface ParticleConfig {
  emoji: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rotation: number;
  scale: number;
  delay: number;
  duration: number;
}

function generateParticles(count: number, centerX: number, centerY: number): ParticleConfig[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const distance = 120 + Math.random() * 180;
    return {
      emoji: PARTICLE_EMOJIS[i % PARTICLE_EMOJIS.length],
      startX: centerX,
      startY: centerY,
      endX: centerX + Math.cos(angle) * distance,
      endY: centerY + Math.sin(angle) * distance - 60,
      rotation: Math.random() * 720 - 360,
      scale: 0.5 + Math.random() * 1,
      delay: Math.random() * 300,
      duration: 800 + Math.random() * 600,
    };
  });
}

const Particle = React.memo(function Particle({ config, trigger }: { config: ParticleConfig; trigger: boolean }) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      opacity.value = withDelay(config.delay, withTiming(1, { duration: 100 }));
      progress.value = withDelay(
        config.delay,
        withTiming(1, { duration: config.duration, easing: Easing.out(Easing.quad) }),
      );
      opacity.value = withDelay(
        config.delay + config.duration * 0.6,
        withTiming(0, { duration: config.duration * 0.4 }),
      );
    }
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: interpolate(progress.value, [0, 1], [config.startX, config.endX]),
    top: interpolate(progress.value, [0, 1], [config.startY, config.endY]),
    opacity: opacity.value,
    transform: [
      { scale: interpolate(progress.value, [0, 0.3, 1], [0, config.scale, 0.2]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, config.rotation])}deg` },
    ],
  }));

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: 20 }}>{config.emoji}</Text>
    </Animated.View>
  );
});

// ─── Crack Lines ────────────────────────────────────────────────────────────

function CrackLines({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.crackContainer, style]} pointerEvents="none">
      <Text style={[styles.crackLine, { top: '25%', left: '35%', transform: [{ rotate: '-30deg' }] }]}>⚡</Text>
      <Text style={[styles.crackLine, { top: '45%', right: '30%', transform: [{ rotate: '25deg' }] }]}>⚡</Text>
      <Text style={[styles.crackLine, { bottom: '30%', left: '40%', transform: [{ rotate: '60deg' }] }]}>⚡</Text>
    </Animated.View>
  );
}

// ─── Main Hatching Screen ───────────────────────────────────────────────────

type Phase = 'idle' | 'wobble' | 'crack' | 'burst' | 'reveal';

/**
 * Egg hatching animation — a cinematic multi-phase experience.
 *
 * 1. Idle   — egg sits peacefully, background glows softly (1s)
 * 2. Wobble — egg rocks with increasing intensity (3s)
 * 3. Crack  — violent shaking, crack lines appear, screen shakes (2s)
 * 4. Burst  — egg explodes, particles fly, bright flash (1s)
 * 5. Reveal — pet bounces in, sparkles orbit, name appears (stays)
 */
export default function HatchingStep() {
  const router = useRouter();
  const { theme } = useTheme();
  const { selectedPet, petCustomName } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('idle');
  const hasNavigated = useRef(false);

  // Core animation values
  const eggRotation = useSharedValue(0);
  const eggScale = useSharedValue(0.8);
  const eggOpacity = useSharedValue(1);
  const eggY = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const bgProgress = useSharedValue(0);
  const petScale = useSharedValue(0);
  const petOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const screenShake = useSharedValue(0);
  const messageOpacity = useSharedValue(0);
  const orbitalAngle = useSharedValue(0);

  const particles = useMemo(
    () => generateParticles(16, SCREEN_WIDTH / 2 - 10, SCREEN_HEIGHT / 2 - 40),
    [],
  );

  const advanceToSummary = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace('/(onboarding)/summary');
  };

  useEffect(() => {
    // Phase 1: Idle — egg enters (0 - 1s)
    eggScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    messageOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));

    // Phase 2: Wobble (1s - 4s)
    const wobbleStart = 1000;
    setTimeout(() => setPhase('wobble'), wobbleStart);

    eggRotation.value = withDelay(
      wobbleStart,
      withRepeat(
        withSequence(
          withTiming(6, { duration: 200, easing: Easing.inOut(Easing.quad) }),
          withTiming(-6, { duration: 200, easing: Easing.inOut(Easing.quad) }),
          withTiming(10, { duration: 150, easing: Easing.inOut(Easing.quad) }),
          withTiming(-10, { duration: 150, easing: Easing.inOut(Easing.quad) }),
          withTiming(14, { duration: 120, easing: Easing.inOut(Easing.quad) }),
          withTiming(-14, { duration: 120, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }),
        ),
        2,
        false,
      ),
    );

    eggY.value = withDelay(
      wobbleStart,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 200 }),
          withTiming(4, { duration: 200 }),
          withTiming(0, { duration: 150 }),
        ),
        4,
        false,
      ),
    );

    bgProgress.value = withDelay(
      wobbleStart,
      withTiming(0.5, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
    );

    // Phase 3: Crack (4s - 5.5s)
    const crackStart = 4000;
    setTimeout(() => setPhase('crack'), crackStart);

    eggRotation.value = withDelay(
      crackStart,
      withRepeat(
        withSequence(
          withTiming(25, { duration: 50, easing: Easing.linear }),
          withTiming(-25, { duration: 50, easing: Easing.linear }),
        ),
        15,
        true,
      ),
    );

    eggScale.value = withDelay(
      crackStart,
      withSequence(
        withTiming(1.15, { duration: 600 }),
        withTiming(1.25, { duration: 500 }),
      ),
    );

    screenShake.value = withDelay(
      crackStart,
      withRepeat(
        withSequence(
          withTiming(3, { duration: 40 }),
          withTiming(-3, { duration: 40 }),
        ),
        15,
        true,
      ),
    );

    bgProgress.value = withDelay(
      crackStart,
      withTiming(1, { duration: 1500 }),
    );

    // Phase 4: Burst (5.5s - 6.5s)
    const burstStart = 5500;
    setTimeout(() => setPhase('burst'), burstStart);

    eggScale.value = withDelay(
      burstStart,
      withTiming(2.5, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
    eggOpacity.value = withDelay(
      burstStart,
      withTiming(0, { duration: 300 }),
    );
    messageOpacity.value = withDelay(burstStart, withTiming(0, { duration: 200 }));
    screenShake.value = withDelay(burstStart + 100, withTiming(0, { duration: 200 }));

    flashOpacity.value = withDelay(
      burstStart,
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }),
      ),
    );

    // Phase 5: Reveal (6.5s+)
    const revealStart = 6500;
    setTimeout(() => setPhase('reveal'), revealStart);

    petOpacity.value = withDelay(
      revealStart,
      withTiming(1, { duration: 400 }),
    );
    petScale.value = withDelay(
      revealStart,
      withSpring(1, { damping: 6, stiffness: 80 }),
    );

    textOpacity.value = withDelay(
      revealStart + 600,
      withTiming(1, { duration: 600 }),
    );

    orbitalAngle.value = withDelay(
      revealStart + 300,
      withRepeat(
        withTiming(360, { duration: 6000, easing: Easing.linear }),
        -1,
        false,
      ),
    );

    // Auto-advance after 10s
    const timeout = setTimeout(advanceToSummary, 10000);
    return () => clearTimeout(timeout);
  }, []);

  // ── Animated Styles ─────────────────────────────────────

  const eggStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: eggY.value },
      { rotate: `${eggRotation.value}deg` },
      { scale: eggScale.value },
    ],
    opacity: eggOpacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: screenShake.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 0.5, 1],
      ['rgba(255,255,255,0)', 'rgba(255,157,194,0.15)', 'rgba(192,132,252,0.25)'],
    ),
  }));

  const petStyle = useAnimatedStyle(() => ({
    transform: [{ scale: petScale.value }],
    opacity: petOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [20, 0]) }],
  }));

  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));

  // Orbital sparkles
  const sparklePositions = [0, 60, 120, 180, 240, 300];
  const sparkleEmojis = ['✨', '💫', '🌟', '✨', '💖', '⭐'];

  const phaseMessages: Record<Phase, string> = {
    idle: 'Your egg is ready...',
    wobble: 'Something is stirring...',
    crack: 'Almost there...!',
    burst: '',
    reveal: '',
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pressable: { flex: 1 },
        fullScreen: { flex: 1 },
        safe: { flex: 1 },
        messageContainer: {
          alignItems: 'center',
          paddingTop: spacing['3xl'],
        },
        message: {
          ...typography.title,
          textAlign: 'center',
          color: theme.colors.textSecondary,
        },
        stage: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        eggContainer: {
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        },
        egg: { fontSize: 140 },
        crackContainer: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
        },
        crackLine: {
          position: 'absolute',
          fontSize: 24,
          color: '#FFA500',
        },
        flash: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: theme.colors.surface,
        },
        petCenter: {
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        },
        petImage: { width: 220, height: 220 },
        petFallback: { fontSize: 140 },
        nameArea: {
          alignItems: 'center',
          paddingBottom: spacing['3xl'],
        },
        sayHello: {
          ...typography.subtitle,
          color: theme.colors.textSecondary,
          marginBottom: spacing.xs,
        },
        petName: {
          ...typography.hero,
          color: theme.colors.primary,
          textAlign: 'center',
        },
        petVibe: {
          ...typography.subtitle,
          color: theme.colors.textSecondary,
          fontSize: 18,
          marginTop: spacing.xs,
        },
        tapHint: {
          ...typography.caption,
          color: theme.colors.textMuted,
          marginTop: spacing.lg,
        },
      }),
    [theme],
  );

  return (
    <Pressable style={styles.pressable} onPress={phase === 'reveal' ? advanceToSummary : undefined}>
      <LinearGradient
        colors={theme.gradients.dreamy as any}
        style={styles.fullScreen}
      >
        <Animated.View style={[styles.fullScreen, bgStyle]}>
          <Animated.View style={[styles.fullScreen, shakeStyle]}>
            <SafeAreaView style={styles.safe}>
              {/* Phase message */}
              <Animated.View style={[styles.messageContainer, messageStyle]}>
                <Text style={styles.message}>{phaseMessages[phase]}</Text>
              </Animated.View>

              {/* Center stage */}
              <View style={styles.stage}>
                {/* Egg */}
                <Animated.View style={[styles.eggContainer, eggStyle]}>
                  <Text style={styles.egg}>🥚</Text>
                  <CrackLines visible={phase === 'crack'} />
                </Animated.View>

                {/* Flash */}
                <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />

                {/* Particles */}
                {particles.map((p, i) => (
                  <Particle key={i} config={p} trigger={phase === 'burst' || phase === 'reveal'} />
                ))}

                {/* Revealed pet */}
                <Animated.View style={[styles.petCenter, petStyle]}>
                  {selectedPet?.image ? (
                    <CachedImage
                      source={{ uri: selectedPet.image }}
                      style={styles.petImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.petFallback}>🐣</Text>
                  )}
                </Animated.View>

                {/* Orbital sparkles */}
                {phase === 'reveal' && sparklePositions.map((offset, i) => (
                  <OrbitalSparkle
                    key={i}
                    emoji={sparkleEmojis[i]}
                    offsetDeg={offset}
                    angleValue={orbitalAngle}
                    radiusValue={90 + i * 10}
                  />
                ))}
              </View>

              {/* Pet name reveal */}
              <Animated.View style={[styles.nameArea, textStyle]}>
                <Text style={styles.sayHello}>Say hello to</Text>
                <Text style={styles.petName}>{petCustomName || selectedPet?.name || 'Your New Friend'}</Text>
                <Text style={styles.petVibe}>{selectedPet?.vibe}</Text>
                {phase === 'reveal' && (
                  <Text style={styles.tapHint}>Tap to continue</Text>
                )}
              </Animated.View>
            </SafeAreaView>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Orbital Sparkle ────────────────────────────────────────────────────────

const OrbitalSparkle = React.memo(function OrbitalSparkle({
  emoji,
  offsetDeg,
  angleValue,
  radiusValue,
}: {
  emoji: string;
  offsetDeg: number;
  angleValue: Animated.SharedValue<number>;
  radiusValue: number;
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(200, withTiming(1, { duration: 600 }));
  }, []);

  const style = useAnimatedStyle(() => {
    const angle = ((angleValue.value + offsetDeg) * Math.PI) / 180;
    return {
      position: 'absolute' as const,
      left: Math.cos(angle) * radiusValue,
      top: Math.sin(angle) * radiusValue,
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
    </Animated.View>
  );
});

