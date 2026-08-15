import { CachedImage } from '@/components/ui/CachedImage';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/store/ThemeProvider';
import { spacing } from '@/constants/theme';
import type { ItemDefinition, PlacedItem } from './types';
import { useCropProgress } from './useCropTick';

const FARM_HARVEST_XP = 10;

export interface CropInfoDrawerRef {
  open: () => void;
  close: () => void;
}

interface CropInfoDrawerProps {
  crop: PlacedItem | null;
  itemDefs: Record<string, ItemDefinition>;
  onHarvest: (col: number, row: number) => void;
  onDismiss: () => void;
}

function formatTime(ms: number) {
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec <= 0) return 'Ready!';
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Crop info drawer — uses AppDrawer format like other farm drawers.
 * Shown when tapping a growing crop with no tool.
 * Displays growth progress, time remaining, yield, and XP.
 */
export const CropInfoDrawer = forwardRef<CropInfoDrawerRef, CropInfoDrawerProps>(
  function CropInfoDrawer({ crop, itemDefs, onHarvest, onDismiss }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const displayCropRef = useRef<PlacedItem | null>(null);
    const { theme } = useTheme();
    const c = theme.colors;

    if (crop) displayCropRef.current = crop;
    const renderCrop = crop ?? displayCropRef.current;

    const { progress, fullyGrown, remainingMs } = useCropProgress(
      renderCrop?.plantedAt,
      renderCrop?.growthMs,
      renderCrop?.watered === true,
    );

    const progressAnim = useSharedValue(progress);
    React.useEffect(() => {
      progressAnim.value = withTiming(progress, { duration: 200 });
    }, [progress, progressAnim]);
    const progressBarStyle = useAnimatedStyle(() => ({
      width: `${Math.round(progressAnim.value * 100)}%`,
    }));

    useImperativeHandle(ref, () => ({
      open: () => drawerRef.current?.open(),
      close: () => drawerRef.current?.close(),
    }));


    const handleHarvest = () => {
      if (renderCrop) {
        onHarvest(renderCrop.col, renderCrop.row);
        onDismiss();
      }
    };

    const def = renderCrop ? itemDefs[renderCrop.itemType] : null;
    const isWatered = renderCrop?.watered === true;
    const isPlanted = !!renderCrop?.plantedAt;

    const grownDef = renderCrop && fullyGrown && def?.harvestYield?.length
      ? itemDefs[def.harvestYield.find((d) => d.itemType !== renderCrop!.itemType)?.itemType ?? def.harvestYield[0].itemType]
      : null;

    const displayName = grownDef?.label ?? def?.label ?? renderCrop?.itemType ?? '';
    const displayImage = grownDef?.imageUrl ?? def?.imageUrl;
    const displayEmoji = grownDef?.emoji ?? def?.emoji;
    const yieldItems = (def?.harvestYield ?? []).filter(
      (d) => d.itemType !== renderCrop?.itemType,
    );

    const statusLabel = !isWatered
      ? 'Needs water'
      : fullyGrown
        ? 'Ready to harvest!'
        : `Growing… ${formatTime(remainingMs)}`;

    const progressColor = fullyGrown ? c.success : '#FFB300';

    const styles = useMemo(
      () => createStyles(c),
      [c],
    );

    return (
      <AppDrawer
        ref={drawerRef}
        title={displayName}
        snapPoints={['45%', '75%']}
        initialSnapIndex={0}
        onClose={onDismiss}
        scrollable
      >
        <View style={styles.content}>
          {/* Crop icon + status */}
          <View style={styles.headerRow}>
            <View style={styles.cropIconWrap}>
              {displayImage ? (
                <CachedImage source={{ uri: displayImage }} style={styles.cropIcon} resizeMode="contain" />
              ) : displayEmoji ? (
                <Text style={styles.cropEmoji}>{displayEmoji}</Text>
              ) : null}
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.statusRow}>
                {!isWatered ? (
                  <Ionicons name="water" size={16} color="#0EA5E9" />
                ) : fullyGrown ? (
                  <Ionicons name="leaf" size={16} color={c.success} />
                ) : (
                  <Ionicons name="time" size={16} color={c.textMuted} />
                )}
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          {/* Progress bar (only when watered & growing) */}
          {isWatered && isPlanted && (
            <View style={styles.progressSection}>
              <View style={[styles.progressTrack, { backgroundColor: c.border + '40' }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { backgroundColor: progressColor },
                    progressBarStyle,
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: c.textSecondary }]}>{Math.round(progress * 100)}%</Text>
            </View>
          )}

          {/* Info rows */}
          <View style={styles.infoGrid}>
            <InfoRow icon="leaf-outline" label="Status" value={isWatered ? (fullyGrown ? 'Harvestable' : 'Growing') : 'Needs water'} colors={c} />
            {isWatered && isPlanted && !fullyGrown && (
              <InfoRow icon="time-outline" label="Time left" value={formatTime(remainingMs)} colors={c} />
            )}
            <InfoRow icon="star-outline" label="Farm XP" value={`+${FARM_HARVEST_XP} XP`} colors={c} />
          </View>

          {/* Expected Yield */}
          {yieldItems.length > 0 && (
            <View style={styles.yieldSection}>
              <Text style={[styles.yieldTitle, { color: c.textSecondary }]}>Expected Yield</Text>
              <View style={styles.yieldRow}>
                {yieldItems.map((drop) => {
                  const dropDef = itemDefs[drop.itemType];
                  return (
                    <View key={drop.itemType} style={styles.yieldItem}>
                      {dropDef?.imageUrl ? (
                        <CachedImage source={{ uri: dropDef.imageUrl }} style={styles.yieldIcon} resizeMode="contain" />
                      ) : (
                        <Text style={styles.yieldEmoji}>{dropDef?.emoji ?? '?'}</Text>
                      )}
                      <Text style={[styles.yieldQty, { color: c.text }]}>×{drop.qty}</Text>
                      <Text style={[styles.yieldLabel, { color: c.textMuted }]} numberOfLines={1}>{dropDef?.label ?? drop.itemType}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Harvest button */}
          {fullyGrown && (
            <Pressable
              style={[styles.harvestBtn, { backgroundColor: c.success }]}
              onPress={handleHarvest}
            >
              <Ionicons name="hand-left-outline" size={18} color={c.onPrimary ?? '#fff'} />
              <Text style={[styles.harvestBtnText, { color: c.onPrimary ?? '#fff' }]}>Harvest</Text>
            </Pressable>
          )}
        </View>
      </AppDrawer>
    );
  },
);

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: { text: string; textMuted: string } }) {
  return (
    <View style={infoRowStyles.row}>
      <Ionicons name={icon as any} size={15} color={colors.textMuted} />
      <Text style={[infoRowStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[infoRowStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, flex: 1 },
  value: { fontSize: 13, fontWeight: '600' },
});

function createStyles(c: { surface: string; surfaceElevated: string; border: string; text: string; textSecondary: string }) {
  return StyleSheet.create({
    content: { paddingBottom: spacing.lg },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: spacing.md,
    },
    cropIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: c.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    cropIcon: { width: 36, height: 36 },
    cropEmoji: { fontSize: 26 },
    headerInfo: { flex: 1, gap: 2 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },

    progressSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: spacing.md,
    },
    progressTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 4 },
    progressLabel: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

    infoGrid: { gap: 8, marginBottom: spacing.md },
    yieldSection: { marginBottom: spacing.lg },
    yieldTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    yieldRow: { flexDirection: 'row', gap: 12 },
    yieldItem: { alignItems: 'center', gap: 3, minWidth: 56 },
    yieldIcon: { width: 30, height: 30 },
    yieldEmoji: { fontSize: 22 },
    yieldQty: { fontSize: 13, fontWeight: '700' },
    yieldLabel: { fontSize: 10, textAlign: 'center' },

    harvestBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: 14,
    },
    harvestBtnText: { fontSize: 15, fontWeight: '700' },
  });
}
