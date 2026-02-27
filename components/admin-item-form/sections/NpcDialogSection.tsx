import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Section } from '../FormField';
import { StableFormInput } from '@/components/ui/StableFormInput';
import type { FormState } from '../types';
import type { FormAction } from '../reducer';

interface NpcDialogSectionProps {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  ts: Record<string, object>;
  colors: { text: string; textSecondary: string; textMuted: string; primary: string; error: string; border: string; surface: string };
}

const stepStyles = StyleSheet.create({
  stepWrap: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepActions: {
    flexDirection: 'row',
    gap: 6,
  },
  stepActionBtn: {
    padding: 2,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 40,
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  addRowText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export function NpcDialogSection({ state, dispatch, ts, colors }: NpcDialogSectionProps) {
  const steps = state.npcDialog ?? [];

  return (
    <Section label="NPC Dialog" sectionLabelStyle={ts.sectionLabel} cardStyle={ts.card}>
      <Text style={[stepStyles.stepLabel, { color: colors.textSecondary }]}>
        Dialog shown when the player taps this item. Uses item label and image as speaker.
      </Text>
      {steps.map((step, idx) => (
        <View key={`npc-${idx}`} style={[stepStyles.stepWrap, { borderColor: colors.border }]}>
          <View style={stepStyles.stepHeader}>
            <Text style={[stepStyles.stepLabel, { color: colors.textSecondary }]}>Step {idx + 1}</Text>
            <View style={stepStyles.stepActions}>
              {idx > 0 && (
                <Pressable
                  onPress={() => dispatch({ type: 'MOVE_NPC_DIALOG_STEP', from: idx, to: idx - 1 })}
                  style={stepStyles.stepActionBtn}
                >
                  <Ionicons name="arrow-up" size={14} color={colors.textMuted} />
                </Pressable>
              )}
              {idx < steps.length - 1 && (
                <Pressable
                  onPress={() => dispatch({ type: 'MOVE_NPC_DIALOG_STEP', from: idx, to: idx + 1 })}
                  style={stepStyles.stepActionBtn}
                >
                  <Ionicons name="arrow-down" size={14} color={colors.textMuted} />
                </Pressable>
              )}
              <Pressable
                onPress={() => dispatch({ type: 'REMOVE_NPC_DIALOG_STEP', index: idx })}
                style={stepStyles.stepActionBtn}
              >
                <Ionicons name="close-circle" size={16} color={colors.error} />
              </Pressable>
            </View>
          </View>
          <StableFormInput
            style={[stepStyles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={step.text}
            onChangeText={(v) => dispatch({ type: 'SET_NPC_DIALOG_STEP', index: idx, text: v })}
            placeholder="NPC dialog text…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>
      ))}
      <Pressable
        style={stepStyles.addRowBtn}
        onPress={() => dispatch({ type: 'ADD_NPC_DIALOG_STEP' })}
      >
        <Ionicons name="add" size={16} color={colors.primary} />
        <Text style={[stepStyles.addRowText, { color: colors.primary }]}>Add Dialog Step</Text>
      </Pressable>
    </Section>
  );
}
