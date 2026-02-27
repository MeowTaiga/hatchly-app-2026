/**
 * Admin Shop Banners — Manage section banners for the Shop tab.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, ActivityIndicator, Image, Switch, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { api, type ShopBanner, type ShopBannerInput } from '@/lib/api';
import { useToast } from '@/store/ToastProvider';
import { useTheme } from '@/store/ThemeProvider';
import { spacing, radius } from '@/constants/theme';

// ─── Banner Row ──────────────────────────────────────────────────────────────

function BannerRow({
  banner, index, onToggleDisplay, onGenerateImage, onDelete, cardStyle, colors,
}: {
  banner: ShopBanner; index: number; cardStyle: object; colors: any;
  onToggleDisplay: (b: ShopBanner, v: boolean) => void;
  onGenerateImage: (b: ShopBanner) => void;
  onDelete: (b: ShopBanner) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const showImage = banner.displayImage && banner.imageUrl;

  const handleGenerate = useCallback(async () => {
    try { setGenerating(true); await api.generateShopBannerImage(banner.id); onGenerateImage(banner); }
    finally { setGenerating(false); }
  }, [banner, onGenerateImage]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
      <View style={cardStyle}>
        <View style={[s.bannerPreview, { backgroundColor: colors.surfaceElevated }]}>
          {showImage ? (
            <Image source={{ uri: banner.imageUrl }} style={s.bannerImage} resizeMode="cover" />
          ) : (
            <View style={s.bannerPlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>No image</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>{banner.key}</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{banner.label}</Text>
          {banner.shopSection && (
            <Text style={{ fontSize: 11, color: colors.textMuted }}>Shop: {banner.shopSection === 'fishing_shop' ? 'Fishing' : banner.shopSection}</Text>
          )}
          <View style={{ marginTop: spacing.sm, gap: 6 }}>
            <View style={s.toggleRow}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Show image</Text>
              <Switch value={banner.displayImage} onValueChange={(v) => onToggleDisplay(banner, v)} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
            <Pressable style={[s.genBtn, generating && s.genBtnDisabled]} onPress={handleGenerate} disabled={generating}>
              {generating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={16} color="#fff" />}
              <Text style={s.genBtnText}>{generating ? 'Generating…' : 'Generate Image'}</Text>
            </Pressable>
          </View>
        </View>
        <Pressable hitSlop={12} onPress={() => onDelete(banner)} style={{ padding: 8 }}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Add Banner Form ────────────────────────────────────────────────────────

const SHOP_SECTION_OPTIONS = [
  { key: '', label: 'Main Shop' },
  { key: 'fishing_shop', label: 'Fishing Shop' },
] as const;

function AddBannerForm({ onAdd, onCancel, cardStyle, inputStyle, colors }: {
  onAdd: (d: ShopBannerInput) => void; onCancel: () => void; cardStyle: object; inputStyle: object; colors: any;
}) {
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [shopSection, setShopSection] = useState<string>('');

  const handleSubmit = useCallback(() => {
    const slug = key.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!slug || !label.trim()) return;
    onAdd({
      key: slug,
      label: label.trim(),
      sortOrder: parseInt(sortOrder, 10) || 0,
      shopSection: shopSection || undefined,
    });
  }, [key, label, sortOrder, shopSection, onAdd]);

  return (
    <View style={cardStyle}>
      <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>New Shop Banner</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>Shop</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {SHOP_SECTION_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key || 'main'}
            onPress={() => setShopSection(opt.key)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: shopSection === opt.key ? colors.primary : colors.surfaceElevated,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: shopSection === opt.key ? '#fff' : colors.textSecondary }}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>Section key (e.g. seasonal, easter)</Text>
      <TextInput style={inputStyle} value={key} onChangeText={setKey} placeholder="seasonal" placeholderTextColor={colors.textMuted} autoCapitalize="none" />
      <Text style={{ fontSize: 12, color: colors.textMuted }}>Display label</Text>
      <TextInput style={inputStyle} value={label} onChangeText={setLabel} placeholder="Seasonal" placeholderTextColor={colors.textMuted} />
      <Text style={{ fontSize: 12, color: colors.textMuted }}>Sort order (lower = left)</Text>
      <TextInput style={inputStyle} value={sortOrder} onChangeText={setSortOrder} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
      <View style={{ flexDirection: 'row', gap: spacing.base, marginTop: spacing.sm }}>
        <Pressable style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }} onPress={onCancel}>
          <Text style={{ fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
        </Pressable>
        <Pressable style={{ flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' }} onPress={handleSubmit}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: '#fff' }}>Add Banner</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdminShopBannersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { colors, typography, shadows } = theme;
  const [banners, setBanners] = useState<ShopBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const list = await api.getShopBanners(); setBanners(list); }
    catch (err: any) { toast(err.message ?? 'Failed to load banners', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleToggleDisplay = useCallback(async (banner: ShopBanner, value: boolean) => {
    try {
      await api.updateShopBanner(banner.id, { displayImage: value });
      setBanners((p) => p.map((b) => (b.id === banner.id ? { ...b, displayImage: value } : b)));
      toast(value ? 'Image visible' : 'Image hidden', 'success');
    } catch (err: any) { toast(err.message ?? 'Failed to update', 'error'); }
  }, [toast]);

  const handleGenerateImage = useCallback(() => { load(); toast('Image generated!', 'success'); }, [load, toast]);

  const handleDelete = useCallback((banner: ShopBanner) => {
    Alert.alert('Delete Banner', `Remove "${banner.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteShopBanner(banner.id); setBanners((p) => p.filter((b) => b.id !== banner.id)); toast('Banner deleted', 'success'); }
        catch (err: any) { toast(err.message ?? 'Failed to delete', 'error'); }
      }},
    ]);
  }, [toast]);

  const handleAdd = useCallback(async (data: ShopBannerInput) => {
    try { await api.createShopBanner(data); setShowAddForm(false); load(); toast('Banner added!', 'success'); }
    catch (err: any) { toast(err.message ?? 'Failed to add', 'error'); }
  }, [load, toast]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerTitle: { flex: 1, textAlign: 'center', ...typography.title, fontSize: 20 },
        subtitle: { ...typography.subtitle, fontSize: 14, marginBottom: spacing.lg, color: colors.textSecondary },
        card: {
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
          borderWidth: 1, borderColor: colors.border, ...shadows.sm,
          marginBottom: spacing.base, gap: spacing.base,
        },
        formCard: {
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
          borderWidth: 1, borderColor: colors.border, ...shadows.sm,
          marginBottom: spacing.base, gap: spacing.sm,
        },
        addCardPlain: {
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
          borderWidth: 1, borderColor: colors.border, ...shadows.sm, marginBottom: spacing.base,
        },
        input: {
          backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
          paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
        },
        emptyText: { fontSize: 14, color: colors.textMuted },
      }),
    [colors, typography, shadows],
  );

  return (
    <GradientBackground bubbleCount={2}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Shop Banners</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>Section banners shown at the top of the Shop.</Text>

        {showAddForm ? (
          <AddBannerForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} cardStyle={styles.formCard} inputStyle={styles.input} colors={colors} />
        ) : (
          <Pressable style={styles.addCardPlain} onPress={() => setShowAddForm(true)}>
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            <Text style={{ fontWeight: '600', fontSize: 15, color: colors.primary }}>Add new banner</Text>
          </Pressable>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          banners.map((b, i) => (
            <BannerRow key={b.id} banner={b} index={i} cardStyle={styles.card}
              colors={colors} onToggleDisplay={handleToggleDisplay}
              onGenerateImage={handleGenerateImage} onDelete={handleDelete} />
          ))
        )}

        {!loading && banners.length === 0 && !showAddForm && (
          <View style={s.empty}>
            <Ionicons name="images-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No banners yet. Add one above.</Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  bannerPreview: { width: 80, height: 48, borderRadius: radius.md, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#6366F1', borderRadius: radius.md, paddingVertical: 8,
  },
  genBtnDisabled: { opacity: 0.6 },
  genBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
});
