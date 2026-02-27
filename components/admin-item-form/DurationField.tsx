/**
 * Number input with a unit dropdown (ms / sec / min / hr).
 * Stores and exposes the value in milliseconds.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StableFormInput } from '@/components/ui/StableFormInput';
import { radius } from '@/constants/theme';

type Unit = 'ms' | 's' | 'min' | 'hr';

const UNITS: { key: Unit; label: string; ms: number }[] = [
  { key: 'ms', label: 'ms', ms: 1 },
  { key: 's', label: 'sec', ms: 1_000 },
  { key: 'min', label: 'min', ms: 60_000 },
  { key: 'hr', label: 'hr', ms: 3_600_000 },
];

function bestUnit(ms: number): Unit {
  if (ms <= 0) return 's';
  if (ms >= 3_600_000 && ms % 3_600_000 === 0) return 'hr';
  if (ms >= 60_000 && ms % 60_000 === 0) return 'min';
  if (ms >= 1_000 && ms % 1_000 === 0) return 's';
  return 'ms';
}

interface DurationFieldProps {
  label: string;
  /** Current value in ms (as a string, matching how form state stores it). */
  valueMs: string;
  /** Called with the new value in ms (as a string). */
  onChangeMs: (ms: string) => void;
  placeholder?: string;
  fieldLabelStyle?: object;
  inputStyle?: object;
  colors: { textMuted: string; textSecondary: string; text: string; primary: string; surfaceElevated: string; border: string };
}

export function DurationField({
  label,
  valueMs,
  onChangeMs,
  placeholder = '60',
  fieldLabelStyle,
  inputStyle,
  colors,
}: DurationFieldProps) {
  const msNum = parseInt(valueMs, 10) || 0;
  const [unit, setUnit] = useState<Unit>(() => bestUnit(msNum));

  useEffect(() => {
    if (msNum > 0) setUnit(bestUnit(msNum));
  }, []);

  const displayValue = useMemo(() => {
    if (!valueMs || msNum === 0) return '';
    const factor = UNITS.find((u) => u.key === unit)!.ms;
    const val = msNum / factor;
    return Number.isInteger(val) ? String(val) : val.toFixed(2);
  }, [valueMs, msNum, unit]);

  const handleTextChange = useCallback((text: string) => {
    const num = parseFloat(text) || 0;
    const factor = UNITS.find((u) => u.key === unit)!.ms;
    onChangeMs(String(Math.round(num * factor)));
  }, [unit, onChangeMs]);

  const handleUnitChange = useCallback((newUnit: Unit) => {
    setUnit(newUnit);
    if (msNum > 0) {
      // Value stays the same in ms, display just recalculates
    }
  }, [msNum]);

  return (
    <View style={{ gap: 4 }}>
      <Text style={fieldLabelStyle}>{label}</Text>
      <View style={s.row}>
        <StableFormInput
          style={[inputStyle, s.input]}
          value={displayValue}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
        <View style={[s.unitRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {UNITS.map((u) => (
            <Pressable
              key={u.key}
              style={[s.unitBtn, unit === u.key && { backgroundColor: colors.primary }]}
              onPress={() => handleUnitChange(u.key)}
            >
              <Text style={[s.unitText, { color: colors.textSecondary }, unit === u.key && s.unitTextActive]}>
                {u.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1 },
  unitRow: {
    flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 1,
  },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 7 },
  unitText: { fontSize: 12, fontWeight: '700' },
  unitTextActive: { color: '#fff' },
});
