import React, { forwardRef, useImperativeHandle, useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useHealthKitAuthorization,
  isHealthKitAvailable,
  getTodayStepCount,
  HEALTH_READ,
  HEALTH_WRITE,
  HKAuthorizationRequestStatus,
} from '@/lib/healthkit';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { PermissionCard } from '@/components/ui/PermissionCard';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

// ─── Public API ─────────────────────────────────────────────────────────────

export interface FitnessDrawerRef {
  open: () => void;
  close: () => void;
}

interface FitnessDrawerProps {
  onStepCountChange?: (steps: number | null) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const FitnessDrawer = forwardRef<FitnessDrawerRef, FitnessDrawerProps>(
  function FitnessDrawer({ onStepCountChange }, ref) {
    const { theme } = useTheme();
    const colors = theme.colors;
    const drawerRef = useRef<AppDrawerRef>(null);
    const { authorizationStatus, requestAuthorization } = useHealthKitAuthorization(
      HEALTH_READ,
      HEALTH_WRITE,
    );
    const [requestDenied, setRequestDenied] = useState(false);
    const [stepCount, setStepCount] = useState<number | null>(null);

    useImperativeHandle(ref, () => ({
      open: () => drawerRef.current?.open(),
      close: () => drawerRef.current?.close(),
    }));

    const hasAccess = authorizationStatus === HKAuthorizationRequestStatus.unnecessary;

    const refreshSteps = useCallback(() => {
      if (!hasAccess) return;
      getTodayStepCount().then((n) => {
        setStepCount(n);
        onStepCountChange?.(n);
      });
    }, [hasAccess, onStepCountChange]);

    useEffect(() => {
      refreshSteps();
    }, [refreshSteps]);

    const handleRequest = useCallback(() => {
      setRequestDenied(false);
      requestAuthorization().then((result) => {
        const granted = result === HKAuthorizationRequestStatus.unnecessary || result === true;
        if (!granted) setRequestDenied(true);
      });
    }, [requestAuthorization]);

    const handleDrawerChange = useCallback(
      (index: number) => {
        if (index >= 0) refreshSteps();
      },
      [refreshSteps],
    );

    const st = useMemo(
      () =>
        StyleSheet.create({
          inner: { gap: spacing.base, paddingBottom: spacing.base },
          heroCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
          },
          heroIcon: {
            width: 38,
            height: 38,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          },
          heroTextWrap: { flex: 1 },
          heroTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
          heroSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
          hintCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.base,
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.md,
          },
          hintText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
          summaryCard: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            alignItems: 'center',
          },
          summaryTitle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: colors.textMuted,
          },
          summaryValue: {
            fontSize: 30,
            fontWeight: '800',
            color: colors.accent,
            marginTop: 4,
          },
          summarySub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        }),
      [colors],
    );

    const isIOS = Platform.OS === 'ios';
    const isChecking = isIOS && authorizationStatus === HKAuthorizationRequestStatus.unknown;
    const shouldRequest = isIOS && authorizationStatus === HKAuthorizationRequestStatus.shouldRequest && !requestDenied;
    const showDenied = isIOS && requestDenied;

    return (
      <AppDrawer
        ref={drawerRef}
        title="Fitness"
        snapPoints={['88%']}
        showCloseButton
        scrollable
        onChange={handleDrawerChange}
      >
        <View style={st.inner}>
          {!isIOS ? (
            <PermissionCard
              icon="phone-portrait-outline"
              title="iOS Only"
              subtitle="Apple Health integration is available on iOS. Fitness tracking will come to Android soon."
              actionLabel="OK"
              onAction={() => drawerRef.current?.close()}
              color={colors.accent}
            />
          ) : !isHealthKitAvailable ? (
            <PermissionCard
              icon="build-outline"
              title="Development Build Required"
              subtitle="Apple Health needs a fresh native build. Run 'npx expo prebuild --clean' then 'eas build --platform ios --profile development', and install the new build."
              actionLabel="OK"
              onAction={() => drawerRef.current?.close()}
              color={colors.accent}
            />
          ) : isChecking ? (
            <View style={st.summaryCard}>
              <Text style={st.summarySub}>Checking Apple Health…</Text>
            </View>
          ) : shouldRequest ? (
            <PermissionCard
              icon="fitness-outline"
              title="Apple Health Access"
              subtitle="Hatchly uses Apple Health to track your steps and keep your fitness goals in sync."
              actionLabel="Allow Apple Health"
              onAction={handleRequest}
              color={colors.accent}
              actionIcon="heart"
            />
          ) : showDenied ? (
            <PermissionCard
              icon="fitness-outline"
              title="Enable in Settings"
              subtitle="Apple Health access was denied. Open Settings to enable it and sync your step data."
              actionLabel="Open Settings"
              onAction={() => Linking.openSettings()}
              color={colors.accent}
              actionIcon="open-outline"
            />
          ) : (
            <>
              <View style={st.heroCard}>
                <View style={[st.heroIcon, { backgroundColor: `${colors.accent}18` }]}>
                  <Ionicons name="fitness" size={20} color={colors.accent} />
                </View>
                <View style={st.heroTextWrap}>
                  <Text style={st.heroTitle}>Fitness from Apple Health</Text>
                  <Text style={st.heroSub}>Your steps sync automatically.</Text>
                </View>
              </View>

              <View style={st.summaryCard}>
                <Text style={st.summaryTitle}>Today</Text>
                <Text style={st.summaryValue}>
                  {stepCount === null ? '—' : stepCount.toLocaleString()}
                </Text>
                <Text style={st.summarySub}>
                  {stepCount === null ? 'Syncing from Apple Health…' : 'Steps today'}
                </Text>
              </View>

              <View style={st.hintCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                <Text style={st.hintText}>
                  Step data from Apple Health will appear here. Make sure you've allowed Hatchly to read activity data.
                </Text>
              </View>
            </>
          )}
        </View>
      </AppDrawer>
    );
  },
);
