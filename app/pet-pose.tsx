import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useAuth } from '@/store/AuthProvider';
import { useTheme } from '@/store/ThemeProvider';
import { api } from '@/lib/api';
import { useToast } from '@/store/ToastProvider';
import { spacing, radius } from '@/constants/theme';
import { PET_POSES } from '@/constants/pet';

// Color options for "Change Pet" — light and dark palettes
const COLOR_OPTIONS = [
  { base: '#FADADD', secondary: '#F9AFAE' },
  { base: '#D7F9F1', secondary: '#B2E2DA' },
  { base: '#FFF1D7', secondary: '#FFD8A8' },
  { base: '#E5D1FF', secondary: '#C7B1FF' },
  { base: '#D0E6FF', secondary: '#A4CFFF' },
  { base: '#1B1B2F', secondary: '#2C2C54' },
  { base: '#1E263C', secondary: '#3A4F7A' },
  { base: '#2B1D3A', secondary: '#5B3C73' },
];

interface CatalogPet {
  name: string;
  vibe: string;
  category: string;
}

export default function PetPoseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [catalog, setCatalog] = useState<CatalogPet[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPet, setSelectedPet] = useState<CatalogPet | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [customName, setCustomName] = useState('');
  const [generatingAllPoses, setGeneratingAllPoses] = useState(false);
  const [generatingPet, setGeneratingPet] = useState(false);
  const [regeneratingPoseKey, setRegeneratingPoseKey] = useState<string | null>(null);

  const petImageUrl = user?.pet?.imageUrl;
  const hasPet = !!petImageUrl;
  const savedPoses = user?.pet?.pose ?? {};
  const currentPet = user?.pet;

  // Fetch catalog
  useEffect(() => {
    api
      .getPetCatalog()
      .then(({ pets }) => setCatalog(pets))
      .catch(() => toast('Failed to load pet catalog', 'error'))
      .finally(() => setCatalogLoading(false));
  }, []);

  const filteredPets = catalog.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vibe.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const generateAllPoses = useCallback(async () => {
    if (!hasPet) {
      toast('You need a pet to generate poses', 'error');
      return;
    }
    setGeneratingAllPoses(true);
    let successCount = 0;
    let failCount = 0;
    try {
      const results = await Promise.allSettled(
        PET_POSES.map((pose) => api.generatePetPose(pose, pose, false)),
      );
      results.forEach((r) => (r.status === 'fulfilled' ? successCount++ : failCount++));
      await refreshUser();
      if (failCount > 0) {
        toast(`${successCount} poses saved, ${failCount} failed`, 'error');
      } else {
        toast(`All ${successCount} poses generated!`, 'success');
      }
    } catch (err) {
      toast((err as Error)?.message ?? 'Failed to generate poses', 'error');
    } finally {
      setGeneratingAllPoses(false);
    }
  }, [hasPet, refreshUser, toast]);

  const regeneratePose = useCallback(
    async (poseKey: string) => {
      if (!hasPet) {
        toast('You need a pet to generate poses', 'error');
        return;
      }
      setRegeneratingPoseKey(poseKey);
      try {
        await api.generatePetPose(poseKey, poseKey, false);
        await refreshUser();
        toast(`${poseKey} pose updated`, 'success');
      } catch (err) {
        toast((err as Error)?.message ?? `Failed to regenerate ${poseKey}`, 'error');
      } finally {
        setRegeneratingPoseKey(null);
      }
    },
    [hasPet, refreshUser, toast],
  );

  const generatePet = useCallback(async () => {
    if (!selectedPet) {
      toast('Select a pet first', 'error');
      return;
    }
    setGeneratingPet(true);
    try {
      await api.generatePetOne({
        name: selectedPet.name,
        vibe: selectedPet.vibe,
        baseColor: selectedColor.base,
        secondaryColor: selectedColor.secondary,
        customName: customName.trim() || undefined,
      });
      await refreshUser();
      toast(`Pet changed to ${selectedPet.name}!`, 'success');
      setSelectedPet(null);
      setCustomName('');
    } catch (err) {
      toast((err as Error)?.message ?? 'Failed to generate pet', 'error');
    } finally {
      setGeneratingPet(false);
    }
  }, [selectedPet, selectedColor, customName, refreshUser, toast]);

  if (!hasPet) {
    return (
      <GradientBackground bubbleCount={2}>
        <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Pet Admin</Text>
          <View style={styles.emptyState}>
            <Ionicons name="paw-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              You need a pet to use this page.
            </Text>
          </View>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground bubbleCount={2}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>Pet Admin</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Generate poses for your pet or change to a new one from the catalog.
        </Text>

        {/* Current pet preview */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Current Pet</Text>
          <View style={styles.currentPetRow}>
            {petImageUrl ? (
              <CachedImage source={{ uri: petImageUrl }} style={styles.petThumb} resizeMode="contain" />
            ) : (
              <View style={[styles.petThumbPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="paw" size={32} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.currentPetInfo}>
              <Text style={[styles.petName, { color: colors.text }]}>
                {currentPet?.customName || currentPet?.name || 'Unknown'}
              </Text>
              <Text style={[styles.petMeta, { color: colors.textMuted }]}>
                {currentPet?.name} · {currentPet?.vibe}
              </Text>
            </View>
          </View>
        </View>

        {/* Generate All Poses */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Generate All Poses</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Generates all poses (sleeping, sleepy, sitting, standing, walking, happy, hungry, sad, wow, eating).
          </Text>
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              generatingAllPoses && styles.btnDisabled,
            ]}
            onPress={generateAllPoses}
            disabled={generatingAllPoses}
          >
            {generatingAllPoses ? (
              <ActivityIndicator color={colors.onPrimary ?? '#fff'} size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={colors.onPrimary ?? '#fff'} />
                <Text style={[styles.primaryBtnText, { color: colors.onPrimary ?? '#fff' }]}>
                  Generate All Poses
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Saved poses grid */}
        {Object.keys(savedPoses).length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Saved Poses</Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Tap a pose to re-generate it.
            </Text>
            <View style={styles.poseGrid}>
              {Object.entries(savedPoses).map(([key, url]) => {
                const isRegenerating = regeneratingPoseKey === key;
                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [
                      styles.poseItem,
                      pressed && !isRegenerating && styles.poseItemPressed,
                    ]}
                    onPress={() => !isRegenerating && regeneratePose(key)}
                    disabled={isRegenerating || generatingAllPoses}
                  >
                    <View style={[styles.poseThumbWrap, { backgroundColor: colors.surfaceElevated }]}>
                      <CachedImage source={{ uri: url }} style={[styles.poseThumb, isRegenerating && styles.poseThumbDimmed]} resizeMode="contain" />
                      {isRegenerating && (
                        <View style={styles.poseThumbOverlay}>
                          <ActivityIndicator color={colors.primary} size="small" />
                          <Text style={styles.poseRegeneratingText}>
                            Regenerating…
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.poseKey, { color: colors.textMuted }]}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Change Pet */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Change Pet</Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Pick any pet from onboarding and generate a new image.
          </Text>

          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Search pets..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {catalogLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <View style={styles.petList}>
              {filteredPets.slice(0, 80).map((pet) => {
                const isSelected =
                  selectedPet?.name === pet.name && selectedPet?.vibe === pet.vibe;
                return (
                  <Pressable
                    key={`${pet.name}-${pet.vibe}`}
                    style={[
                      styles.petChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedPet(isSelected ? null : pet)}
                  >
                    <Text
                      style={[
                        styles.petChipText,
                        { color: isSelected ? (colors.onPrimary ?? '#fff') : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {pet.name}
                    </Text>
                    <Text
                      style={[
                        styles.petChipVibe,
                        {
                          color: isSelected ? (colors.onPrimary ?? '#fff') + 'CC' : colors.textMuted,
                        },
                      ]}
                    >
                      {pet.vibe}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {selectedPet && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text, marginTop: spacing.lg }]}>
                Color
              </Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((c, i) => (
                  <Pressable
                    key={i}
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: c.base,
                        borderColor:
                          selectedColor.base === c.base ? colors.primary : colors.border,
                        borderWidth: selectedColor.base === c.base ? 3 : 1,
                      },
                    ]}
                    onPress={() => setSelectedColor(c)}
                  >
                    <View
                      style={[
                        styles.colorSwatchInner,
                        { backgroundColor: c.secondary },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={`Custom name (optional, default: ${selectedPet.name})`}
                placeholderTextColor={colors.textMuted}
                value={customName}
                onChangeText={setCustomName}
              />

              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary },
                  generatingPet && styles.btnDisabled,
                ]}
                onPress={generatePet}
                disabled={generatingPet}
              >
                {generatingPet ? (
                  <ActivityIndicator color={colors.onPrimary ?? '#fff'} size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color={colors.onPrimary ?? '#fff'} />
                    <Text style={[styles.primaryBtnText, { color: colors.onPrimary ?? '#fff' }]}>
                      Generate & Replace Pet
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 16,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  currentPetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  petThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  petThumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPetInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 17,
    fontWeight: '600',
  },
  petMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  poseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  poseItem: {
    alignItems: 'center',
  },
  poseItemPressed: {
    opacity: 0.7,
  },
  poseThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  poseThumb: {
    width: 56,
    height: 56,
  },
  poseThumbDimmed: {
    opacity: 0.4,
  },
  poseThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poseRegeneratingText: {
    fontSize: 9,
    marginTop: 4,
    color: '#fff',
  },
  poseKey: {
    fontSize: 11,
    marginTop: 4,
  },
  searchInput: {
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  petList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  petChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  petChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  petChipVibe: {
    fontSize: 10,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
