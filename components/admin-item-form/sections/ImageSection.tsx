import React, { useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { CachedImage } from '@/components/ui/CachedImage';
import { StableFormInput } from '@/components/ui/StableFormInput';
import { Ionicons } from '@expo/vector-icons';
import { ItemSearchDropdown } from '@/components/ui/ItemSearchDropdown';
import type { SearchableItem } from '@/components/ui/ItemSearchDropdown';
import { Section, Field } from '../FormField';
import type { FormState } from '../types';

const NONE_OPTION: SearchableItem = { key: '', label: 'None' };

interface ImageSectionProps {
  state: FormState;
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  basePrompt: string;
  effectivePrompt: string;
  onPromptChange: (t: string) => void;
  resetPrompt: () => void;
  handleGenerateImage: () => void;
  handleGenerateImageAndNew: () => void;
  generatingImage: boolean;
  promptTouched: boolean;
  searchableItems: SearchableItem[];
  colorSchemeItems: SearchableItem[];
  onColorSchemeSelect: (itemType: string) => void;
  onToggleColor: (index: number) => void;
  ts: Record<string, object>;
  colors: { textMuted: string; primary: string; error: string };
  s: Record<string, object>;
}

export function ImageSection({
  state,
  setField,
  basePrompt,
  effectivePrompt,
  onPromptChange,
  resetPrompt,
  handleGenerateImage,
  handleGenerateImageAndNew,
  generatingImage,
  promptTouched,
  searchableItems,
  colorSchemeItems,
  onColorSchemeSelect,
  onToggleColor,
  ts,
  colors,
  s,
}: ImageSectionProps) {
  const referenceItems = useMemo(
    () => [NONE_OPTION, ...searchableItems],
    [searchableItems],
  );

  return (
    <Section label="Image & Generation" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      {state.imageUrl ? (
        <View style={s.imagePreviewWrap}>
          <CachedImage source={{ uri: state.imageUrl }} style={s.imagePreview} />
          <Pressable onPress={() => setField('imageUrl', '')} style={s.clearImageBtn}>
            <Ionicons name="close-circle" size={22} color={colors.error} />
          </Pressable>
        </View>
      ) : (
        <View style={ts.noImageBox}>
          <Text style={{ fontSize: 40 }}>📦</Text>
          <Text style={ts.noImageText}>No image yet</Text>
        </View>
      )}
      <Field label="Reference Item" fieldLabelStyle={ts.fieldLabel}>
        <ItemSearchDropdown
          items={referenceItems}
          value={state.referenceItemType ?? ''}
          onSelect={(v) => setField('referenceItemType', v)}
          placeholder="None (optional style reference)"
        />
      </Field>
      <Field label="Color Scheme (from item)" fieldLabelStyle={ts.fieldLabel}>
        <ItemSearchDropdown
          items={colorSchemeItems}
          value={state.colorSchemeItemType ?? ''}
          onSelect={onColorSchemeSelect}
          placeholder="None (extract palette from item image)"
        />
      </Field>
      {state.extractedColors.length > 0 && (
        <Field label="Palette colors (tap to toggle for prompt)" fieldLabelStyle={ts.fieldLabel}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {state.extractedColors.map((hex, i) => {
              const selected = state.selectedColorIndices.includes(i);
              return (
                <Pressable
                  key={i}
                  onPress={() => onToggleColor(i)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: hex,
                    borderWidth: selected ? 3 : 1,
                    borderColor: selected ? colors.primary : 'rgba(0,0,0,0.2)',
                  }}
                />
              );
            })}
          </View>
        </Field>
      )}
      <Field label="AI Prompt" fieldLabelStyle={ts.fieldLabel}>
        <StableFormInput
          style={[ts.input, ts.promptInput]}
          value={basePrompt}
          onChangeText={onPromptChange}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        {promptTouched && (
          <Pressable style={s.resetPromptBtn} onPress={resetPrompt}>
            <Ionicons name="refresh" size={14} color={colors.primary} />
            <Text style={ts.resetPromptText}>Reset to default</Text>
          </Pressable>
        )}
      </Field>
      <Pressable
        style={[s.genBtn, generatingImage && s.genBtnDisabled]}
        onPress={handleGenerateImage}
        disabled={generatingImage}
      >
        {generatingImage ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="sparkles" size={18} color="#fff" />
        )}
        <Text style={ts.genBtnText}>
          {generatingImage
            ? (state.autoConnect ? 'Saving & generating 6 variants...' : 'Saving & generating...')
            : (state.autoConnect ? 'Save & Generate Fence Images' : 'Save & Generate Image')}
        </Text>
      </Pressable>
      <Pressable
        style={[s.genBtn, ts.genBtnSecondary, generatingImage && s.genBtnDisabled]}
        onPress={handleGenerateImageAndNew}
        disabled={generatingImage}
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
        <Text style={[ts.genBtnText, { color: colors.primary }]}>Save & Make New Item</Text>
      </Pressable>
    </Section>
  );
}
