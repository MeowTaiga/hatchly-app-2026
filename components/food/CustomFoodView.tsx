import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { PermissionCard } from '@/components/ui/PermissionCard';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import { NUTRIENT_CONFIG, NUTRIENT_KEYS, type NutrientKey } from '@/lib/nutrients';
import { useLabelScan } from '@/components/food/useLabelScan';
import {
  draftFromFood,
  type CustomFoodDraft,
} from '@/components/food/customFood';
import type { FoodDetail } from '@/lib/api';

const CORE: NutrientKey[] = ['protein', 'fat', 'carbs'];
const EXTRA = NUTRIENT_KEYS.filter((key) => !CORE.includes(key));

interface CustomFoodViewProps {
  draft: CustomFoodDraft;
  setDraft: React.Dispatch<React.SetStateAction<CustomFoodDraft>>;
  onBack: () => void;
}

export function CustomFoodView({ draft, setDraft, onBack }: CustomFoodViewProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const st = styles(colors);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [watching, setWatching] = useState(true);
  const [filledFromLabel, setFilledFromLabel] = useState(false);

  const { reading } = useLabelScan(cameraRef, watching && !!permission?.granted, (food: FoodDetail) => {
    setDraft(draftFromFood(food));
    setFilledFromLabel(true);
    setWatching(false);
  });

  const setField = (key: keyof CustomFoodDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const setNutrient = (key: NutrientKey, value: string) => {
    setDraft((prev) => ({ ...prev, nutrients: { ...prev.nutrients, [key]: value } }));
  };

  return (
    <View style={st.wrap}>
      <View style={st.header}>
        <Pressable onPress={onBack} hitSlop={12} style={st.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>New food</Text>
          <Text style={st.sub}>Type it in, or hold a Nutrition Facts label up to the camera</Text>
        </View>
      </View>

      {!permission ? (
        <View style={st.cameraPlaceholder}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !permission.granted ? (
        <PermissionCard
          icon="camera-outline"
          title="Camera helps fill this in"
          subtitle="Point at a Nutrition Facts label and we’ll read the numbers. You can still type everything by hand."
          actionLabel={permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}
          onAction={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
          color={colors.primary}
          actionIcon={permission.canAskAgain ? 'camera' : 'open-outline'}
        />
      ) : watching ? (
        <View style={st.cameraWrap}>
          <CameraView ref={cameraRef} style={st.camera} facing="back" animateShutter={false} />
          <View style={st.scanFrame} pointerEvents="none" />
          <View style={st.cameraBadge}>
            {reading ? <ActivityIndicator size="small" color="#fff" /> : (
              <Ionicons name="nutrition-outline" size={14} color="#fff" />
            )}
            <Text style={st.cameraBadgeText}>
              {reading ? 'Reading label…' : 'Looking for Nutrition Facts'}
            </Text>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => { setFilledFromLabel(false); setWatching(true); }}
          style={st.rescan}
        >
          <Ionicons name={filledFromLabel ? 'checkmark-circle' : 'camera-outline'} size={18} color={colors.primary} />
          <Text style={st.rescanText}>
            {filledFromLabel ? 'Filled from label — scan again' : 'Scan Nutrition Facts'}
          </Text>
        </Pressable>
      )}

      <Field label="Name" value={draft.name} onChange={(v) => setField('name', v)} placeholder="e.g. Greek yogurt" autoFocus colors={colors} />
      <Field label="Brand" value={draft.brand} onChange={(v) => setField('brand', v)} placeholder="Optional" colors={colors} />
      <Field label="Serving size" value={draft.servingDescription} onChange={(v) => setField('servingDescription', v)} placeholder="1 cup (227g)" colors={colors} />
      <Field label="Calories" value={draft.calories} onChange={(v) => setField('calories', v)} placeholder="0" keyboard="decimal-pad" colors={colors} />

      <Text style={st.sec}>Macros</Text>
      <View style={st.grid}>
        {CORE.map((key) => (
          <Field
            key={key}
            compact
            label={`${NUTRIENT_CONFIG[key].label} (${NUTRIENT_CONFIG[key].unit})`}
            value={draft.nutrients[key]}
            onChange={(v) => setNutrient(key, v)}
            placeholder="0"
            keyboard="decimal-pad"
            colors={colors}
          />
        ))}
      </View>

      <Text style={st.sec}>More nutrients</Text>
      <View style={st.grid}>
        {EXTRA.map((key) => (
          <Field
            key={key}
            compact
            label={`${NUTRIENT_CONFIG[key].shortLabel} (${NUTRIENT_CONFIG[key].unit})`}
            value={draft.nutrients[key]}
            onChange={(v) => setNutrient(key, v)}
            placeholder="0"
            keyboard="decimal-pad"
            colors={colors}
          />
        ))}
      </View>

    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  compact,
  autoFocus,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'decimal-pad';
  compact?: boolean;
  autoFocus?: boolean;
  colors: { text: string; textMuted: string; surfaceElevated: string; border: string };
}) {
  return (
    <View style={[fieldStyles.wrap, compact && fieldStyles.compact]}>
      <Text style={[fieldStyles.label, { color: colors.textMuted }]}>{label}</Text>
      <BottomSheetTextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboard ?? 'default'}
        autoFocus={autoFocus}
        style={[
          fieldStyles.input,
          { color: colors.text, backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        ]}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  compact: { width: '48%', marginBottom: 10 },
  label: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.4,
    textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15, fontWeight: '600',
  },
});

function styles(colors: import('@/constants/theme').ColorPalette) {
  return StyleSheet.create({
    wrap: { flex: 1, paddingBottom: 88 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    backBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
    cameraPlaceholder: {
      height: 120, alignItems: 'center', justifyContent: 'center',
      marginBottom: 14,
    },
    cameraWrap: {
      height: Dimensions.get('window').height * 0.26,
      borderRadius: radius.xl, overflow: 'hidden', marginBottom: 14,
    },
    camera: { flex: 1 },
    scanFrame: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 1, borderColor: '#ffffff66',
      borderRadius: radius.xl, margin: spacing.md, borderStyle: 'dashed',
    },
    cameraBadge: {
      position: 'absolute', left: 12, right: 12, bottom: 10,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#00000099', borderRadius: radius.full,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    cameraBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },
    rescan: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: `${colors.primary}14`,
      borderRadius: radius.md, padding: 12, marginBottom: 14,
    },
    rescanText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    sec: {
      fontSize: 11, fontWeight: '700', color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 4,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  });
}
