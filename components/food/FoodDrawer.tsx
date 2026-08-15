import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { PermissionCard } from '@/components/ui/PermissionCard';
import { useFood } from '@/store/FoodProvider';
import { useWeight } from '@/store/WeightProvider';
import { api, type FoodItem, type FoodDetail, type FoodServing, type RecentFood, type MealType, type RateOption } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';
import { CustomFoodView } from '@/components/food/CustomFoodView';
import { useLabelScan } from '@/components/food/useLabelScan';
import {
  draftToFood,
  emptyCustomDraft,
  draftFromFood,
  isCustomDraftReady,
  type CustomFoodDraft,
} from '@/components/food/customFood';

// ─── Public API ─────────────────────────────────────────────────────────────

export interface FoodDrawerRef {
  open: () => void;
  close: () => void;
}

interface FoodDrawerProps {
  onFoodLogged?: (xpGained: number, gemsAwarded?: number) => void;
}

// ─── Default macro ratios (used to derive protein/fat/carbs targets from calorie target) ───

function macroTargets(cal: number) {
  return {
    calories: cal,
    protein: Math.round((cal * 0.25) / 4),
    fat: Math.round((cal * 0.25) / 9),
    carbs: Math.round((cal * 0.50) / 4),
  };
}

const MEAL_OPTIONS: { key: MealType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'breakfast', icon: 'sunny-outline', label: 'Bfast' },
  { key: 'lunch', icon: 'restaurant-outline', label: 'Lunch' },
  { key: 'dinner', icon: 'moon-outline', label: 'Dinner' },
  { key: 'snack', icon: 'cafe-outline', label: 'Snack' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMealForTime(): MealType {
  const t = new Date().getHours() + new Date().getMinutes() / 60;
  if (t < 11.5) return 'breakfast';
  if (t < 16) return 'lunch';
  if (t < 21) return 'dinner';
  return 'snack';
}

function parseMacros(desc: string) {
  const cal = desc.match(/Cal(?:ories)?:\s*([\d.]+)/i)?.[1];
  const fat = desc.match(/Fat:\s*([\d.]+)/i)?.[1];
  const carbs = desc.match(/Carb(?:s|ohydrate)?:\s*([\d.]+)/i)?.[1];
  const protein = desc.match(/Prot(?:ein)?:\s*([\d.]+)/i)?.[1];
  return {
    calories: cal ? Math.round(parseFloat(cal)) : null,
    fat: fat ? parseFloat(fat) : null,
    carbs: carbs ? parseFloat(carbs) : null,
    protein: protein ? parseFloat(protein) : null,
  };
}

export function foodIcon(name: string): keyof typeof Ionicons.glyphMap {
  const n = name.toLowerCase();
  if (/chicken|turkey|wing|thigh|breast/.test(n)) return 'egg-outline';
  if (/beef|steak|burger|meat|pork|lamb|bacon|sausage/.test(n)) return 'fast-food-outline';
  if (/fish|salmon|tuna|shrimp|seafood/.test(n)) return 'fish-outline';
  if (/apple|banana|fruit|berry|orange|grape|mango|peach|pear|melon/.test(n)) return 'leaf-outline';
  if (/salad|lettuce|spinach|kale|vegetable|veggie|broccoli|carrot/.test(n)) return 'leaf-outline';
  if (/milk|juice|soda|water|drink|coffee|tea|latte|smoothie|shake/.test(n)) return 'water-outline';
  if (/bread|toast|bagel|muffin|cereal|oat|granola/.test(n)) return 'pizza-outline';
  if (/rice|pasta|noodle/.test(n)) return 'restaurant-outline';
  if (/pizza/.test(n)) return 'pizza-outline';
  if (/egg/.test(n)) return 'egg-outline';
  if (/cheese|yogurt|butter|cream/.test(n)) return 'cube-outline';
  if (/cake|cookie|ice cream|chocolate|candy|donut|dessert/.test(n)) return 'ice-cream-outline';
  return 'nutrition-outline';
}

function pct(val: number, daily: number) {
  return Math.round((val / daily) * 100);
}

/** Multiply a serving description naturally: "8 fl oz" × 2 → "16 fl oz", supports ¼ and ½ */
export function multiplyDesc(desc: string, qty: number): string {
  if (qty === 1) return desc;
  const m = desc.match(/^([\d.]+)\s*(.+)/);
  if (m) {
    const n = parseFloat(m[1]) * qty;
    let numStr: string;
    if (Math.abs(n - 0.25) < 0.01) numStr = '¼';
    else if (Math.abs(n - 0.5) < 0.01) numStr = '½';
    else if (Math.abs(n - 0.75) < 0.01) numStr = '¾';
    else numStr = n % 1 === 0 ? String(n) : n.toFixed(1);
    return `${numStr} ${m[2]}`;
  }
  const fracLabels: Record<number, string> = { 0.25: '¼', 0.5: '½' };
  return fracLabels[qty as keyof typeof fracLabels] ? `${fracLabels[qty as keyof typeof fracLabels]} ${desc}` : `${qty} ${desc}`;
}

/** Generate serving + qty combos as a flat list (includes half & quarter servings) */
function buildServingOptions(servings: FoodServing[]) {
  const opts: { id: string; serving: FoodServing; qty: number; label: string; cal: number }[] = [];
  const qtys = [0.25, 0.5, 1, 2, 3];
  servings.forEach((sv, idx) => {
    for (const qty of qtys) {
      opts.push({
        id: `${idx}-${sv.servingId}-${qty}`,
        serving: sv,
        qty,
        label: multiplyDesc(sv.description, qty),
        cal: Math.round(sv.calories * qty),
      });
    }
  });
  return opts;
}

// ─── State ──────────────────────────────────────────────────────────────────

type Mode = 'browse' | 'scan' | 'custom' | 'log' | 'goal' | 'goalConfirm';

interface LogState {
  foodId: string;
  name: string;
  brand?: string;
  servings: FoodServing[];
  serving: FoodServing | null;
  qty: number;
  meal: MealType;
}

const EMPTY: LogState = {
  foodId: '', name: '', servings: [], serving: null, qty: 1, meal: 'lunch',
};

// ─── Theme context for drawer styles ──────────────────────────────────────────

const FoodDrawerThemeContext = React.createContext<{ st: ReturnType<typeof createFoodDrawerStyles>; colors: import('@/constants/theme').ColorPalette } | null>(null);

function useFoodDrawerTheme() {
  const ctx = React.useContext(FoodDrawerThemeContext);
  if (!ctx) throw new Error('FoodDrawer child must be inside FoodDrawer');
  return ctx;
}

// ─── Root Component ─────────────────────────────────────────────────────────

export const FoodDrawer = forwardRef<FoodDrawerRef, FoodDrawerProps>(
  function FoodDrawer({ onFoodLogged }, ref) {
    const { theme } = useTheme();
    const st = useMemo(() => createFoodDrawerStyles(theme), [theme]);
    const drawerRef = useRef<AppDrawerRef>(null);
    const searchInputRef = useRef<any>(null);
    const { totals: dailyTotals, logFood } = useFood();
    const { goal, goalLoaded, rateOptions, tdee, currentWeight, goalWeight, dailyCalorieTarget, setGoal } = useWeight();
    const [mode, setMode] = useState<Mode>('browse');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FoodItem[]>([]);
    const [recent, setRecent] = useState<RecentFood[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [log, setLog] = useState<LogState>(EMPTY);
    const [customDraft, setCustomDraft] = useState<CustomFoodDraft>(emptyCustomDraft);
    const [confirmedOption, setConfirmedOption] = useState<RateOption | null>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const searchGenRef = useRef(0);
    const queryRef = useRef('');

    const daily = useMemo(() => macroTargets(dailyCalorieTarget), [dailyCalorieTarget]);

    const clearSearch = useCallback(() => {
      queryRef.current = '';
      setQuery('');
      setResults([]);
      setLoading(false);
      clearTimeout(searchTimer.current);
      searchGenRef.current++;
      try { searchInputRef.current?.clear?.(); } catch {}
    }, []);

    useImperativeHandle(ref, () => ({
      open() {
        if (goalLoaded && !goal) {
          setMode('goal');
        } else {
          setMode('browse');
        }
        clearSearch();
        drawerRef.current?.open();
        loadRecent();
      },
      close() { drawerRef.current?.close(); },
    }));

    const loadRecent = useCallback(async () => {
      try { setRecent((await api.getRecentFoods()).foods); } catch {}
    }, []);

    const handleSearchChange = useCallback((text: string) => {
      queryRef.current = text;
      setQuery(text);
      clearTimeout(searchTimer.current);
      if (!text.trim()) { setResults([]); setLoading(false); return; }
      setLoading(true);
      const gen = ++searchGenRef.current;
      searchTimer.current = setTimeout(async () => {
        try {
          const res = await api.searchFood(queryRef.current.trim());
          if (searchGenRef.current === gen) setResults(res.foods);
        } catch {
          if (searchGenRef.current === gen) setResults([]);
        } finally {
          if (searchGenRef.current === gen) setLoading(false);
        }
      }, 400);
    }, []);

    const openLogForFood = useCallback((food: FoodDetail) => {
      setLog({
        foodId: food.foodId, name: food.name, brand: food.brand,
        servings: food.servings,
        serving: food.servings[0] ?? null,
        qty: 1,
        meal: getMealForTime(),
      });
      setMode('log');
    }, []);

    const selectFood = useCallback(async (id: string, name: string, brand?: string) => {
      setLoading(true);
      try {
        const { food } = await api.getFoodDetail(id);
        openLogForFood(food);
      } catch {}
      setLoading(false);
    }, [openLogForFood]);

    const handleBarcodeScanned = useCallback((food: FoodDetail) => {
      openLogForFood(food);
    }, [openLogForFood]);

    const openCustom = useCallback((food?: FoodDetail) => {
      setCustomDraft(food ? draftFromFood(food) : emptyCustomDraft());
      setMode('custom');
    }, []);

    const handleLabelScanned = useCallback((food: FoodDetail) => {
      openCustom(food);
    }, [openCustom]);

    const handleCustomContinue = useCallback(() => {
      if (!isCustomDraftReady(customDraft)) return;
      openLogForFood(draftToFood(customDraft));
    }, [customDraft, openLogForFood]);

    const handleLog = useCallback(async () => {
      if (!log.serving || submitting) return;
      setSubmitting(true);
      try {
        const { xpGained, gemsAwarded } = await logFood({
          foodId: log.foodId, foodName: log.name, brandName: log.brand,
          servingDescription: log.serving.description,
          numberOfServings: log.qty,
          calories: log.serving.calories, protein: log.serving.protein,
          fat: log.serving.fat, carbs: log.serving.carbs,
          sugar: log.serving.sugar, fiber: log.serving.fiber,
          saturatedFat: log.serving.saturatedFat, transFat: log.serving.transFat,
          addedSugars: log.serving.addedSugars,
          sodium: log.serving.sodium, potassium: log.serving.potassium,
          cholesterol: log.serving.cholesterol,
          iron: log.serving.iron, calcium: log.serving.calcium,
          vitaminA: log.serving.vitaminA, vitaminC: log.serving.vitaminC, vitaminD: log.serving.vitaminD,
          mealType: log.meal,
        });
        onFoodLogged?.(xpGained, gemsAwarded ?? 0);
        drawerRef.current?.close();
      } catch {}
      setSubmitting(false);
    }, [log, submitting, onFoodLogged, logFood]);

    const goBack = useCallback(() => setMode('browse'), []);

    const themeValue = useMemo(() => ({ st, colors: theme.colors }), [st, theme.colors]);

    const colors = theme.colors;

    const handleGoalSelected = useCallback(async (params: { weeklyRateLbs: number } | { dailyCalories: number }, option?: RateOption) => {
      setSubmitting(true);
      try {
        await setGoal(params);
        if (option) {
          setConfirmedOption(option);
        } else {
          const data = await api.getWeightGoal();
          const g = data.goal;
          if (g) {
            setConfirmedOption({
              weeklyRateLbs: g.weeklyRateLbs,
              dailyCalories: g.dailyCalories,
              estimatedWeeks: 0,
              safe: Math.abs(g.weeklyRateLbs) <= 2,
            });
          }
        }
        setMode('goalConfirm');
      } catch {}
      setSubmitting(false);
    }, [setGoal]);

    const n = useMemo(() => {
      if (!log.serving) return null;
      const q = log.qty;
      const s = log.serving;
      return {
        cal: Math.round(s.calories * q),
        protein: +(s.protein * q).toFixed(1),
        fat: +(s.fat * q).toFixed(1),
        carbs: +(s.carbs * q).toFixed(1),
        sugar: +(s.sugar ?? 0) * q,
        fiber: +(s.fiber ?? 0) * q,
        sodium: Math.round((s.sodium ?? 0) * q),
      };
    }, [log.serving, log.qty]);

    const today = dailyTotals;
    const insets = useSafeAreaInsets();

    const drawerTitle = mode === 'goal' ? 'Set Your Goal'
      : mode === 'goalConfirm' ? undefined
      : mode === 'log' ? undefined
      : mode === 'scan' ? undefined
      : mode === 'custom' ? undefined
      : 'Log Food';

    const browseFooter = mode === 'browse' ? (
      <View style={[st.searchWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable style={st.searchBar} onPress={() => searchInputRef.current?.focus()}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <BottomSheetTextInput
            ref={searchInputRef}
            style={st.searchInput}
            placeholder="Search foods..."
            placeholderTextColor={colors.textMuted}
            onChangeText={handleSearchChange}
            autoCapitalize="none" returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </Pressable>
        <Pressable onPress={() => setMode('goal')} hitSlop={8} style={({ pressed }) => [st.toolbarBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="flag-outline" size={18} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => setMode('scan')} hitSlop={8} style={({ pressed }) => [st.toolbarBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="barcode-outline" size={18} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => openCustom()} hitSlop={8} style={({ pressed }) => [st.toolbarBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
      </View>
    ) : undefined;

    const customReady = isCustomDraftReady(customDraft);
    const customFooter = mode === 'custom' ? (
      <View style={[st.searchWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          onPress={handleCustomContinue}
          disabled={!customReady}
          style={[st.logBtn, { flex: 1 }, !customReady && st.logBtnOff]}
        >
          <Ionicons name="arrow-forward-circle" size={20} color={colors.onPrimary ?? '#fff'} />
          <Text style={st.logBtnText}>Continue</Text>
        </Pressable>
      </View>
    ) : undefined;

    return (
      <AppDrawer
        ref={drawerRef}
        title={drawerTitle}
        snapPoints={['92%']}
        showCloseButton={mode === 'browse' || mode === 'goal'}
        scrollable={mode !== 'scan'}
        footerKey={mode}
        footer={browseFooter ?? customFooter}
        onClose={() => { setMode('browse'); clearSearch(); }}
      >
        <FoodDrawerThemeContext.Provider value={themeValue}>
        {mode === 'goalConfirm' && confirmedOption ? (
          <GoalConfirmView
            option={confirmedOption}
            goalWeight={goalWeight}
            onContinue={() => { setMode('browse'); loadRecent(); }}
          />
        ) : mode === 'goal' ? (
          <GoalSetupView
            rateOptions={rateOptions}
            tdee={tdee}
            currentWeight={currentWeight}
            goalWeight={goalWeight}
            submitting={submitting}
            activeGoal={goal}
            onSelect={handleGoalSelected}
            onSkip={() => setMode('browse')}
          />
        ) : mode === 'scan' ? (
          <ScanView onScanned={handleBarcodeScanned} onLabel={handleLabelScanned} onBack={goBack} />
        ) : mode === 'custom' ? (
          <CustomFoodView draft={customDraft} setDraft={setCustomDraft} onBack={goBack} />
        ) : mode === 'log' ? (
          <LogView
            log={log} setLog={setLog} n={n} today={today} daily={daily}
            onBack={goBack} onSubmit={handleLog} submitting={submitting}
          />
        ) : (
          <BrowseView
            query={query}
            results={results} recent={recent}
            loading={loading} onSelect={selectFood}
          />
        )}
        </FoodDrawerThemeContext.Provider>
      </AppDrawer>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Browse View
// ═══════════════════════════════════════════════════════════════════════════

function BrowseView({ query, results, recent, loading, onSelect }: {
  query: string;
  results: FoodItem[]; recent: RecentFood[];
  loading: boolean; onSelect: (id: string, name: string, brand?: string) => void;
}) {
  const { st, colors } = useFoodDrawerTheme();
  return (
    <View style={st.flex}>
      {loading && <ActivityIndicator style={st.loader} color={colors.primary} />}

      {query.trim() ? (
        results.length > 0 ? results.map((f) => (
          <FoodRow key={f.foodId} name={f.name} brand={f.brand}
            macros={parseMacros(f.description)}
            onPress={() => onSelect(f.foodId, f.name, f.brand)} />
        )) : !loading && <Text style={st.emptyText}>No results found</Text>
      ) : (
        <>
          {recent.length > 0 && <Text style={st.sectionTitle}>Recently Logged</Text>}
          {recent.map((r) => (
            <FoodRow key={r.foodId + r.lastLogged} name={r.foodName} brand={r.brandName}
              macros={{
                calories: r.calories, protein: r.protein, fat: r.fat, carbs: r.carbs,
                sugar: r.sugar, fiber: r.fiber, sodium: r.sodium,
              }}
              onPress={() => onSelect(r.foodId, r.foodName, r.brandName)} />
          ))}
          {recent.length === 0 && !loading && (
            <View style={st.emptyBox}>
              <Ionicons name="restaurant-outline" size={40} color={colors.textMuted} />
              <Text style={st.emptyText}>Search for a food to get started!</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Scan View — barcode scanner using device camera
// ═══════════════════════════════════════════════════════════════════════════

function ScanView({ onScanned, onLabel, onBack }: {
  onScanned: (food: FoodDetail) => void;
  onLabel: (food: FoodDetail) => void;
  onBack: () => void;
}) {
  const { st, colors } = useFoodDrawerTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [foundFood, setFoundFood] = useState<FoodDetail | null>(null);
  const [foundKind, setFoundKind] = useState<'barcode' | 'label'>('barcode');

  const labelEnabled = !!permission?.granted && !scanned && !scanning && !foundFood && !scanError;
  useLabelScan(cameraRef, labelEnabled, (food) => {
    setScanned(true);
    setFoundKind('label');
    setFoundFood(food);
  });

  const handleBarCodeScanned = useCallback(async ({ data }: { type: string; data: string }) => {
    if (scanned || scanning) return;
    setScanned(true);
    setScanning(true);
    setScanError(null);
    setFoundFood(null);
    try {
      const { food } = await api.getFoodByBarcode(data);
      setFoundKind('barcode');
      setFoundFood(food);
    } catch {
      setScanError('Could not find food for this barcode. Try a Nutrition Facts label or search.');
      setTimeout(() => setScanned(false), 2000);
    } finally {
      setScanning(false);
    }
  }, [scanned, scanning]);

  const handleRetry = useCallback(() => {
    setScanError(null);
    setFoundFood(null);
    setScanned(false);
  }, []);

  const handleContinueWithFood = useCallback(() => {
    if (!foundFood) return;
    if (foundKind === 'label') onLabel(foundFood);
    else onScanned(foundFood);
  }, [foundFood, foundKind, onLabel, onScanned]);

  if (!permission) {
    return (
      <View style={st.scanContainer}>
        <View style={st.scanHeader}>
          <View style={st.scanBackBtn} />
          <View style={st.scanTitleWrap}>
            <Ionicons name="scan-outline" size={20} color={colors.primary} />
            <Text style={st.scanTitle}>Scan food</Text>
          </View>
          <View style={st.scanBackBtn} />
        </View>
        <View style={[st.scanHintCard, { justifyContent: 'center' }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={st.scanHint}>Checking camera…</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    const showOpenSettings = !permission.canAskAgain;
    return (
      <View style={st.scanContainer}>
        <PermissionCard
          icon="camera-outline"
          title="Camera Access Required"
          subtitle="Hatchly uses your camera to scan barcodes and Nutrition Facts labels so you can log meals in seconds."
          actionLabel={showOpenSettings ? 'Open Settings' : 'Allow Camera'}
          onAction={showOpenSettings ? () => Linking.openSettings() : requestPermission}
          color={colors.primary}
          actionIcon={showOpenSettings ? 'open-outline' : 'camera'}
        />
      </View>
    );
  }

  return (
    <View style={st.scanContainer}>
      <View style={st.scanHeader}>
        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [st.scanBackBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={st.scanTitleWrap}>
            <Ionicons name="scan-outline" size={20} color={colors.primary} />
            <Text style={st.scanTitle}>Scan food</Text>
        </View>
        <View style={st.scanBackBtn} />
      </View>

      <View style={st.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={st.camera}
          facing="back"
          animateShutter={false}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={st.scanFrame} pointerEvents="none" />
      </View>

      {/* Loading — show loader in button (non-blocking) */}
      {scanning && (
        <View style={st.scanFoundBtn}>
          <View style={st.scanFoundIcon}>
            <ActivityIndicator size="small" color={colors.onPrimary ?? '#fff'} />
          </View>
          <View style={st.scanFoundBody}>
            <Text style={st.scanFoundLabel}>Looking up</Text>
            <Text style={st.scanFoundName}>Finding food…</Text>
          </View>
        </View>
      )}

      {/* Found food - continue button */}
      {foundFood && !scanning && (
        <Pressable
          onPress={handleContinueWithFood}
          style={({ pressed }) => [st.scanFoundBtn, pressed && { opacity: 0.85 }]}
        >
          <View style={st.scanFoundIcon}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
          <View style={st.scanFoundBody}>
            <Text style={st.scanFoundLabel}>{foundKind === 'label' ? 'Nutrition facts' : 'Found'}</Text>
            <Text style={st.scanFoundName} numberOfLines={1}>{foundFood.name}</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color={colors.onPrimary ?? '#fff'} />
        </Pressable>
      )}

      {/* Error message */}
      {scanError && !scanning && (
        <View style={st.scanErrorCard}>
          <View style={st.scanErrorTop}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={st.scanErrorText}>{scanError}</Text>
          </View>
          <View style={st.scanErrorActions}>
            <Pressable onPress={handleRetry} style={({ pressed }) => [st.scanErrorBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={st.scanErrorBtnText}>Try Again</Text>
            </Pressable>
            <Pressable onPress={onBack} style={({ pressed }) => [st.scanErrorBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name="search" size={16} color={colors.primary} />
              <Text style={st.scanErrorBtnText}>Search Instead</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Default hint (only when idle, not loading) */}
      {!foundFood && !scanError && !scanning && (
        <View style={st.scanHintCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={st.scanHint}>Point at a barcode, or a Nutrition Facts label to start a custom food</Text>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Food Row — smart icon + macro chips
// ═══════════════════════════════════════════════════════════════════════════

function FoodRow({ name, brand, macros, onPress }: {
  name: string; brand?: string;
  macros: {
    calories: number | null; protein: number | null; fat: number | null; carbs: number | null;
    sugar?: number | null; fiber?: number | null; sodium?: number | null;
  };
  onPress: () => void;
}) {
  const { st, colors } = useFoodDrawerTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.row, pressed && st.rowPressed]}>
      <View style={st.rowIcon}>
        <Ionicons name={foodIcon(name)} size={20} color={colors.primary} />
      </View>
      <View style={st.rowBody}>
        <Text style={st.rowName} numberOfLines={1}>{name}</Text>
        {brand ? <Text style={st.rowBrand} numberOfLines={1}>{brand}</Text> : null}
        <View style={st.chips}>
          {macros.calories != null && <Chip v={`${macros.calories}`} u="cal" c={colors.primary} />}
        </View>
      </View>
      <Ionicons name="add-circle" size={24} color={colors.primary} />
    </Pressable>
  );
}

function Chip({ v, u, c }: { v: string; u: string; c: string }) {
  const { st } = useFoodDrawerTheme();
  return (
    <View style={[st.chip, { backgroundColor: `${c}20` }]}>
      <Text style={[st.chipVal, { color: c }]}>{v}<Text style={st.chipUnit}> {u}</Text></Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Log View — consolidated single page
// ═══════════════════════════════════════════════════════════════════════════

function LogView({ log, setLog, n, today, daily, onBack, onSubmit, submitting }: {
  log: LogState;
  setLog: React.Dispatch<React.SetStateAction<LogState>>;
  n: { cal: number; protein: number; fat: number; carbs: number; sugar?: number; fiber?: number; sodium?: number } | null;
  today: { calories: number; protein: number; fat: number; carbs: number; sugar?: number; fiber?: number; sodium?: number };
  daily: { calories: number; protein: number; fat: number; carbs: number };
  onBack: () => void; onSubmit: () => void; submitting: boolean;
}) {
  const { st, colors } = useFoodDrawerTheme();
  const insets = useSafeAreaInsets();
  const opts = useMemo(() => buildServingOptions(log.servings), [log.servings]);
  const activeId = log.serving
    ? opts.find((o) => o.serving.servingId === log.serving!.servingId && o.serving.description === log.serving!.description && o.qty === log.qty)?.id ?? ''
    : '';

  return (
    <View style={st.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.logScroll}>
        {/* Header */}
        <View style={st.logHeader}>
          <Pressable onPress={onBack} hitSlop={12} style={st.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={st.rowIcon}>
            <Ionicons name={foodIcon(log.name)} size={22} color={colors.primary} />
          </View>
          <View style={st.logHeaderText}>
            <Text style={st.logTitle} numberOfLines={1}>{log.name}</Text>
            {log.brand && <Text style={st.logBrand}>{log.brand}</Text>}
          </View>
        </View>

        {/* Serving + Qty — single horizontal scroller */}
        {opts.length > 0 && (
          <View style={st.sec}>
            <Text style={st.secLabel}>Serving Size</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.hScroll}>
              {opts.map((o) => {
                const on = activeId === o.id;
                return (
                  <Pressable key={o.id}
                    onPress={() => setLog((p) => ({ ...p, serving: o.serving, qty: o.qty }))}
                    style={[st.servChip, on && st.servChipOn]}>
                    <Text style={[st.servText, on && st.servTextOn]} numberOfLines={1}>{o.label}</Text>
                    <Text style={[st.servCal, on && st.servCalOn]}>{o.cal} cal</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Meal type */}
        <View style={st.sec}>
          <Text style={st.secLabel}>Meal</Text>
          <View style={st.mealRow}>
            {MEAL_OPTIONS.map((m) => {
              const on = log.meal === m.key;
              return (
                <Pressable key={m.key}
                  onPress={() => setLog((p) => ({ ...p, meal: m.key }))}
                  style={[st.mealChip, on && st.mealOn]}>
                  <Ionicons name={m.icon} size={16} color={on ? (colors.onPrimary ?? '#fff') : colors.textSecondary} />
                  <Text style={[st.mealText, on && st.mealTextOn]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Nutrition breakdown */}
        {n && (
          <View style={st.nutritionCard}>
            <NutrientBar label="Calories" thisFood={n.cal} soFar={today.calories} daily={daily.calories} unit="cal" color={colors.primary} />
            <NutrientBar label="Protein" thisFood={n.protein} soFar={today.protein} daily={daily.protein} unit="g" color={colors.accent} />
            <NutrientBar label="Fat" thisFood={n.fat} soFar={today.fat} daily={daily.fat} unit="g" color="#F59E0B" />
            <NutrientBar label="Carbs" thisFood={n.carbs} soFar={today.carbs} daily={daily.carbs} unit="g" color={colors.secondary} />
            {((n.sugar ?? 0) > 0 || (today.sugar ?? 0) > 0) && (
              <NutrientBar label="Sugar" thisFood={n.sugar ?? 0} soFar={today.sugar ?? 0} daily={50} unit="g" color="#A78BFA" />
            )}
            {((n.fiber ?? 0) > 0 || (today.fiber ?? 0) > 0) && (
              <NutrientBar label="Fiber" thisFood={n.fiber ?? 0} soFar={today.fiber ?? 0} daily={30} unit="g" color="#34D399" />
            )}
            {((n.sodium ?? 0) > 0 || (today.sodium ?? 0) > 0) && (
              <NutrientBar label="Sodium" thisFood={n.sodium ?? 0} soFar={today.sodium ?? 0} daily={2300} unit="mg" color="#60A5FA" />
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed bottom log button — absolute so it floats */}
      <View style={[st.logBtnWrap, { bottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={onSubmit}
          disabled={!log.serving || submitting}
          style={[st.logBtn, (!log.serving || submitting) && st.logBtnOff]}>
          {submitting ? <ActivityIndicator color={colors.onPrimary ?? '#fff'} /> : (
            <>
              <Ionicons name="add-circle" size={20} color={colors.onPrimary ?? '#fff'} />
              <Text style={st.logBtnText}>
                Log {n ? `${n.cal} cal` : 'Food'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Goal Setup View — rate-based picker with custom calorie input
// ═══════════════════════════════════════════════════════════════════════════

const RATE_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  '0.5': { label: 'Relaxed', desc: 'Sustainable & steady', icon: 'leaf-outline' },
  '1': { label: 'Moderate', desc: 'Recommended pace', icon: 'fitness-outline' },
  '1.5': { label: 'Aggressive', desc: 'Faster, more discipline', icon: 'flash-outline' },
};

function GoalSetupView({ rateOptions, tdee, currentWeight, goalWeight, submitting, activeGoal, onSelect, onSkip }: {
  rateOptions: RateOption[];
  tdee: number | null;
  currentWeight: number | null;
  goalWeight: number;
  submitting: boolean;
  activeGoal: { weeklyRateLbs: number; dailyCalories: number } | null;
  onSelect: (params: { weeklyRateLbs: number } | { dailyCalories: number }, option?: RateOption) => void;
  onSkip: () => void;
}) {
  const { st, colors } = useFoodDrawerTheme();
  const insets = useSafeAreaInsets();
  const [customMode, setCustomMode] = useState(false);
  const [customCal, setCustomCal] = useState('');
  const diff = (currentWeight ?? 0) - goalWeight;
  const isLoss = diff > 0;
  const absDiff = Math.abs(diff);
  const activeRate = activeGoal ? Math.abs(activeGoal.weeklyRateLbs) : null;

  const formatWeeks = (weeks: number) => {
    if (weeks <= 0) return '';
    if (weeks < 8) return `~${weeks} weeks`;
    const mo = Math.round(weeks / 4.345);
    return `~${mo} month${mo !== 1 ? 's' : ''}`;
  };

  const handleCustomSubmit = () => {
    const val = parseInt(customCal, 10);
    if (!isNaN(val) && val >= 800) {
      onSelect({ dailyCalories: val });
    }
  };

  return (
    <View style={st.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.goalScroll}>
        <View style={st.goalHeader}>
          <View style={st.goalIconBubble}>
            <Ionicons name="flag" size={28} color={colors.primary} />
          </View>
          <Text style={st.goalTitle}>
            {activeGoal ? 'Update your goal' : isLoss ? 'Reach your goal weight' : 'Build to your goal weight'}
          </Text>
          <Text style={st.goalSub}>
            {currentWeight ? `${currentWeight} lbs` : '—'} → {goalWeight} lbs
            {absDiff > 0 && (
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {' '}({isLoss ? '-' : '+'}{absDiff.toFixed(1)} lbs)
              </Text>
            )}
          </Text>
          {tdee != null && (
            <Text style={st.goalTdee}>
              Your estimated daily burn: <Text style={{ fontWeight: '700', color: colors.text }}>{tdee} cal</Text>
            </Text>
          )}
        </View>

        <Text style={st.secLabel}>Choose your pace</Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          {rateOptions.map((opt) => {
            const absRate = Math.abs(opt.weeklyRateLbs);
            const key = absRate.toString();
            const meta = RATE_LABELS[key] ?? { label: `${absRate} lb/wk`, desc: '', icon: 'ellipse-outline' };
            const isActive = activeRate != null && Math.abs(activeRate - absRate) < 0.01;
            const isRecommended = absRate === 1;
            return (
              <Pressable
                key={key}
                onPress={() => !submitting && onSelect({ weeklyRateLbs: absRate }, opt)}
                disabled={submitting}
                style={({ pressed }) => [
                  st.rateCard,
                  isActive && st.rateCardActive,
                  isRecommended && !isActive && st.rateCardRecommended,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[st.rateIconWrap, isActive && { backgroundColor: (colors.onPrimary ?? '#fff') + '20' }]}>
                  <Ionicons name={meta.icon as any} size={22} color={isActive ? (colors.onPrimary ?? '#fff') : colors.primary} />
                </View>
                <View style={st.rateBody}>
                  <View style={st.rateTopRow}>
                    <Text style={[st.rateLabel, isActive && { color: colors.onPrimary ?? '#fff' }]}>
                      {meta.label}
                    </Text>
                    {isRecommended && !isActive && (
                      <View style={st.rateRecommendedBadge}>
                        <Text style={st.rateRecommendedText}>Recommended</Text>
                      </View>
                    )}
                    {isActive && (
                      <View style={st.rateCurrentBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.onPrimary ?? '#fff'} />
                        <Text style={st.rateCurrentText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[st.rateDesc, isActive && { color: (colors.onPrimary ?? '#fff') + 'B3' }]}>
                    {meta.desc}
                  </Text>
                  <View style={st.rateStats}>
                    <View style={st.rateStat}>
                      <Ionicons name="trending-down-outline" size={13} color={isActive ? (colors.onPrimary ?? '#fff') + '99' : colors.textMuted} />
                      <Text style={[st.rateStatText, isActive && { color: (colors.onPrimary ?? '#fff') + 'CC' }]}>
                        {absRate} lb/week
                      </Text>
                    </View>
                    <View style={st.rateStat}>
                      <Ionicons name="flame-outline" size={13} color={isActive ? (colors.onPrimary ?? '#fff') + '99' : colors.textMuted} />
                      <Text style={[st.rateStatText, isActive && { color: (colors.onPrimary ?? '#fff') + 'CC' }]}>
                        {opt.dailyCalories} cal/day
                      </Text>
                    </View>
                    {opt.estimatedWeeks > 0 && (
                      <View style={st.rateStat}>
                        <Ionicons name="calendar-outline" size={13} color={isActive ? (colors.onPrimary ?? '#fff') + '99' : colors.textMuted} />
                        <Text style={[st.rateStatText, isActive && { color: (colors.onPrimary ?? '#fff') + 'CC' }]}>
                          {formatWeeks(opt.estimatedWeeks)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Custom calorie input */}
        <Pressable
          onPress={() => setCustomMode(!customMode)}
          style={st.customToggle}
        >
          <Ionicons name={customMode ? 'chevron-up' : 'options-outline'} size={18} color={colors.primary} />
          <Text style={st.customToggleText}>Set a custom daily calorie goal</Text>
        </Pressable>

        {customMode && (
          <View style={st.customSection}>
            <Text style={st.customHint}>
              Enter your target daily calories (min 800)
            </Text>
            <View style={st.customRow}>
              <TextInput
                style={st.customInput}
                value={customCal}
                onChangeText={setCustomCal}
                placeholder={String(tdee ?? 2000)}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={5}
              />
              <Text style={st.customUnit}>cal/day</Text>
              <Pressable
                onPress={handleCustomSubmit}
                disabled={submitting || !customCal || parseInt(customCal, 10) < 800}
                style={({ pressed }) => [
                  st.customBtn,
                  (submitting || !customCal || parseInt(customCal, 10) < 800) && { opacity: 0.4 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.onPrimary ?? '#fff'} />
                ) : (
                  <Text style={st.customBtnText}>Set</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        <Text style={st.goalDisclaimer}>
          Calorie targets are estimates based on your profile. Consult a professional for personalized advice.
        </Text>
      </ScrollView>

      <View style={[st.goalSkipWrap, { bottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={onSkip} style={st.goalSkipBtn}>
          <Text style={st.goalSkipText}>{activeGoal ? 'Go back' : 'Skip for now'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Goal Confirm View — feel-good celebration after setting a goal
// ═══════════════════════════════════════════════════════════════════════════

function GoalConfirmView({ option, goalWeight, onContinue }: {
  option: RateOption;
  goalWeight: number;
  onContinue: () => void;
}) {
  const { st, colors } = useFoodDrawerTheme();
  const insets = useSafeAreaInsets();
  const rate = Math.abs(option.weeklyRateLbs);
  const weeks = option.estimatedWeeks ?? 0;
  const targetDate = new Date();
  if (weeks > 0) targetDate.setDate(targetDate.getDate() + weeks * 7);
  const dateStr = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={st.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.confirmScroll}>
        {/* Celebration */}
        <View style={st.confirmHero}>
          <View style={st.confirmEmojiBubble}>
            <Text style={st.confirmEmoji}>🎯</Text>
          </View>
          <Text style={st.confirmTitle}>You're all set!</Text>
          <Text style={st.confirmSub}>
            Your personalized plan is ready. Every meal you log brings you closer to your goal.
          </Text>
        </View>

        {/* Goal summary card */}
        <View style={st.confirmCard}>
          <View style={st.confirmRow}>
            <View style={st.confirmRowIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View style={st.confirmRowBody}>
              <Text style={st.confirmRowLabel}>Target date</Text>
              <Text style={st.confirmRowValue}>{dateStr}</Text>
            </View>
          </View>

          <View style={st.confirmSep} />

          <View style={st.confirmRow}>
            <View style={st.confirmRowIcon}>
              <Ionicons name="flame-outline" size={18} color={colors.primary} />
            </View>
            <View style={st.confirmRowBody}>
              <Text style={st.confirmRowLabel}>Daily budget</Text>
              <Text style={st.confirmRowValue}>{option.dailyCalories} calories</Text>
            </View>
          </View>

          <View style={st.confirmSep} />

          <View style={st.confirmRow}>
            <View style={st.confirmRowIcon}>
              <Ionicons name="trending-down-outline" size={18} color={colors.successDark} />
            </View>
            <View style={st.confirmRowBody}>
              <Text style={st.confirmRowLabel}>Weekly pace</Text>
              <Text style={st.confirmRowValue}>{rate.toFixed(1)} lbs / week</Text>
            </View>
          </View>

          <View style={st.confirmSep} />

          <View style={st.confirmRow}>
            <View style={st.confirmRowIcon}>
              <Ionicons name="flag-outline" size={18} color={colors.secondary} />
            </View>
            <View style={st.confirmRowBody}>
              <Text style={st.confirmRowLabel}>Goal weight</Text>
              <Text style={st.confirmRowValue}>{goalWeight} lbs</Text>
            </View>
          </View>
        </View>

        <Text style={st.confirmMotivation}>
          Small consistent steps lead to big results. You've got this! 💪
        </Text>
      </ScrollView>

      {/* CTA button */}
      <View style={[st.logBtnWrap, { bottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={onContinue} style={st.logBtn}>
          <Ionicons name="restaurant-outline" size={20} color={colors.onPrimary ?? '#fff'} />
          <Text style={st.logBtnText}>Start logging food</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Nutrient Bar — today so far + this food + % daily
// ═══════════════════════════════════════════════════════════════════════════

function NutrientBar({ label, thisFood, soFar, daily, unit, color }: {
  label: string; thisFood: number; soFar: number; daily: number; unit: string; color: string;
}) {
  const { st } = useFoodDrawerTheme();
  const total = soFar + thisFood;
  const soFarPct = Math.min(soFar / daily, 1);
  const thisPct = Math.min(thisFood / daily, 1);
  const totalPct = pct(total, daily);

  return (
    <View style={st.nbRow}>
      <View style={st.nbHeader}>
        <Text style={st.nbLabel}>{label}</Text>
        <Text style={st.nbValues}>
          <Text style={{ color, fontWeight: '700' }}>+{thisFood % 1 === 0 ? thisFood : thisFood.toFixed(1)}</Text>
          <Text style={st.nbMuted}> · {Math.round(total)}{unit} / {daily}{unit}</Text>
        </Text>
      </View>
      <View style={st.nbTrack}>
        <View style={[st.nbFillSoFar, { width: `${soFarPct * 100}%`, backgroundColor: `${color}40` }]} />
        <View style={[st.nbFillThis, { width: `${thisPct * 100}%`, left: `${soFarPct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={[st.nbPct, { color }]}>{totalPct}% of daily</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles (theme-aware)
// ═══════════════════════════════════════════════════════════════════════════

function createFoodDrawerStyles(theme: import('@/constants/theme').AppTheme) {
  const colors = theme.colors;
  const typography = theme.typography;
  const shadows = theme.shadows;
  return StyleSheet.create({
  flex: { flex: 1 },

  // Search footer
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.xl, paddingTop: 10,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceElevated, borderRadius: radius.full,
    paddingHorizontal: 14, height: 48, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  loader: { marginVertical: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 6,
  },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },

  // Food row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowPressed: { opacity: 0.6 },
  rowIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowBrand: { fontSize: 12, color: colors.textSecondary },
  chips: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 3 },

  chip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  chipVal: { fontSize: 11, fontWeight: '700' },
  chipUnit: { fontWeight: '500', fontSize: 10 },

  // Log view
  logScroll: { paddingBottom: 100 },
  logHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingBottom: 16,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  logHeaderText: { flex: 1 },
  logTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  logBrand: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  // Sections
  sec: { marginBottom: 18 },
  secLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },

  // Serving chips
  hScroll: { gap: 8 },
  servChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5, borderColor: 'transparent',
    alignItems: 'center',
  },
  servChipOn: { backgroundColor: `${colors.primary}12`, borderColor: colors.primary },
  servText: { fontSize: 13, fontWeight: '600', color: colors.text },
  servTextOn: { color: colors.primary },
  servCal: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  servCalOn: { color: colors.primaryLight },

  // Meal
  mealRow: { flexDirection: 'row', gap: 6 },
  mealChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  mealOn: { backgroundColor: colors.primary },
  mealText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  mealTextOn: { color: colors.onPrimary ?? '#fff' },

  // Nutrition
  nutritionCard: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.lg,
    padding: 14, gap: 14,
  },

  // Nutrient bar
  nbRow: { gap: 4 },
  nbHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nbLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  nbValues: { fontSize: 12 },
  nbMuted: { color: colors.textMuted },
  nbTrack: {
    height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden',
  },
  nbFillSoFar: { position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 3 },
  nbFillThis: { position: 'absolute', top: 0, height: '100%', borderRadius: 3 },
  nbPct: { fontSize: 10, fontWeight: '600', textAlign: 'right' },

  // Toolbar icons (inline with search bar)
  toolbarBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center', justifyContent: 'center',
  },

  // Scanner
  scanContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  scanBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scanTitle: {
    ...typography.label,
    fontSize: 18,
  },
  cameraWrap: {
    flex: 1,
    minHeight: Dimensions.get('window').height * 0.38,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.md,
  },
  camera: { flex: 1 },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: colors.text + '4D',
    borderRadius: radius.xl,
    margin: spacing.lg,
    borderStyle: 'dashed',
  },
  scanHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
  },
  scanHint: {
    flex: 1,
    ...typography.caption,
    lineHeight: 18,
  },
  scanFoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: spacing.md,
    ...shadows.md,
  },
  scanFoundIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanFoundBody: { flex: 1 },
  scanFoundLabel: {
    fontSize: 11, fontWeight: '600',
    color: (colors.onPrimary ?? '#fff') + 'B3',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  scanFoundName: {
    fontSize: 16, fontWeight: '700',
    color: colors.onPrimary ?? '#fff',
  },
  scanErrorCard: {
    backgroundColor: `${colors.error}08`,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.error}25`,
    padding: 14,
    marginTop: spacing.md,
    gap: 10,
  },
  scanErrorTop: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  scanErrorText: {
    flex: 1, fontSize: 13, fontWeight: '500',
    color: colors.error, lineHeight: 18,
  },
  scanErrorActions: {
    flexDirection: 'row', gap: 10,
  },
  scanErrorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  scanErrorBtnText: {
    fontSize: 13, fontWeight: '600', color: colors.primary,
  },

  // Log button
  logBtnWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
  },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: 14,
    borderRadius: radius.full, gap: 8,
  },
  logBtnOff: { opacity: 0.4 },
  logBtnText: { ...typography.button, fontSize: 16, color: colors.onPrimary ?? '#fff' },

  // Goal setup
  goalScroll: { paddingBottom: 80 },
  goalHeader: { alignItems: 'center', paddingBottom: 24, gap: 6 },
  goalIconBubble: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center',
  },
  goalSub: {
    fontSize: 15, color: colors.textSecondary, textAlign: 'center',
  },
  goalTdee: {
    fontSize: 13, color: colors.textMuted, marginTop: 4,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  rateCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  rateCardRecommended: {
    borderColor: `${colors.primary}50`,
    backgroundColor: `${colors.primary}08`,
  },
  rateIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  rateBody: { flex: 1, gap: 2 },
  rateTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  rateDesc: { fontSize: 12, color: colors.textSecondary },
  rateStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  rateStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rateStatText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  rateRecommendedBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
  },
  rateRecommendedText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  rateCurrentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  rateCurrentText: { fontSize: 10, fontWeight: '700', color: colors.onPrimary ?? '#fff' },
  customToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  customToggleText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  customSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  customHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customInput: {
    flex: 1, height: 44,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 18, fontWeight: '700',
    color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  customUnit: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  customBtn: {
    height: 44, paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  customBtnText: { fontSize: 15, fontWeight: '700', color: colors.onPrimary ?? '#fff' },
  goalDisclaimer: {
    fontSize: 11, color: colors.textMuted, textAlign: 'center',
    lineHeight: 16, paddingHorizontal: 12,
  },
  goalSkipWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, alignItems: 'center',
  },
  goalSkipBtn: {
    paddingVertical: 12, paddingHorizontal: 24,
  },
  goalSkipText: {
    fontSize: 14, fontWeight: '600', color: colors.textMuted,
    textDecorationLine: 'underline',
  },

  // Goal confirm
  confirmScroll: { paddingBottom: 100, paddingTop: 20 },
  confirmHero: { alignItems: 'center', paddingBottom: 28, gap: 8 },
  confirmEmojiBubble: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  confirmEmoji: { fontSize: 40 },
  confirmTitle: {
    fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center',
  },
  confirmSub: {
    fontSize: 15, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 22, paddingHorizontal: 16,
  },
  confirmCard: {
    backgroundColor: colors.surface + 'CC',
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    marginBottom: 20,
  },
  confirmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  confirmRowIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmRowBody: { flex: 1 },
  confirmRowLabel: {
    fontSize: 12, color: colors.textMuted, fontWeight: '500',
  },
  confirmRowValue: {
    fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 1,
  },
  confirmSep: {
    height: 1, backgroundColor: colors.border, marginVertical: 12,
  },
  confirmMotivation: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    fontWeight: '500', lineHeight: 20,
  },
  });
}
