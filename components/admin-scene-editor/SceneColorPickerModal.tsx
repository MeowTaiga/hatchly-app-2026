import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useTheme } from '@/store/ThemeProvider';

/** Common ground/background colors for scenes (greens, browns, sands, blues, grays). */
const SCENE_COLORS = [
  // Greens (grass, foliage)
  '#7EC87E', '#6EBB6E', '#5A9E5A', '#4A8E4A', '#3D7A3D',
  '#8FD88F', '#9EE89E', '#A8F0A8', '#5EB85E', '#4CAF50',
  // Browns (earth, dirt)
  '#8B5E3C', '#A0522D', '#6D4C2E', '#5D4037', '#795548',
  '#A1887F', '#BCAAA4', '#8D6E63', '#6D4C41', '#4E342E',
  // Sands / warm neutrals
  '#D4C4A8', '#E8D4B8', '#F0DFC8', '#C4B59A', '#B8A88C',
  '#E8E0D0', '#D8D0C0', '#C8C0B0', '#DEB887', '#D2B48C',
  // Blues (water, sky)
  '#5B9BD5', '#4A90D9', '#6BB3E8', '#87CEEB', '#B0E0E6',
  '#4682B4', '#5F9EA0', '#20B2AA', '#3D7EA6', '#2E6B8A',
  // Grays / neutrals
  '#9E9E9E', '#757575', '#616161', '#424242', '#303030',
  '#BDBDBD', '#E0E0E0', '#EEEEEE', '#78909C', '#607D8B',
];

interface SceneColorPickerModalProps {
  visible: boolean;
  currentColor: string;
  onSelect: (hex: string) => void;
  onClose: () => void;
}

export function SceneColorPickerModal({
  visible,
  currentColor,
  onSelect,
  onClose,
}: SceneColorPickerModalProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const validColor = /^#[0-9a-fA-F]{6}$/.test(currentColor) ? currentColor : '#7EC87E';
  const [hexInput, setHexInput] = useState(validColor);

  useEffect(() => {
    if (visible) setHexInput(validColor);
  }, [visible, validColor]);

  const handleSelectPreset = (hex: string) => {
    onSelect(hex);
    setHexInput(hex);
    onClose();
  };

  const handleApplyCustom = () => {
    const trimmed = hexInput.trim();
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
      onSelect(withHash);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.content, { backgroundColor: colors.surface }]} onPress={Keyboard.dismiss}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Pick color</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {SCENE_COLORS.map((hex, i) => {
                const isSelected = currentColor.toLowerCase() === hex.toLowerCase();
                return (
                  <Pressable
                    key={`${hex}-${i}`}
                    onPress={() => handleSelectPreset(hex)}
                    style={[
                      styles.swatch,
                      { backgroundColor: hex },
                      isSelected && styles.swatchSelected,
                    ]}
                  />
                );
              })}
            </View>

            <View style={styles.customRow}>
              <Text style={[styles.label, { color: colors.text }]}>Custom hex</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  value={hexInput}
                  onChangeText={setHexInput}
                  placeholder="#7EC87E"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  maxLength={7}
                />
                <Pressable
                  onPress={handleApplyCustom}
                  style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.applyText}>Apply</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  customRow: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  applyBtn: {
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
