/**
 * Drawer for adding/editing a quest step.
 * Simplified: stepId + empty requirements. Full step editor can be expanded later.
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { AppDrawer, type AppDrawerRef } from '@/components/ui/AppDrawer';
import { Field } from '../FormField';
import type { AdminQuestStep } from '@/lib/api';
import { useTheme } from '@/store/ThemeProvider';
import { createThemedStyles } from '../styles';

interface AddStepDrawerProps {
  existingStepIds: string[];
  onSave: (step: AdminQuestStep, editIndex?: number) => void;
}

export interface AddStepDrawerRef {
  open: (initial?: AdminQuestStep | null, editIndex?: number) => void;
}

export const AddStepDrawer = forwardRef<AddStepDrawerRef, AddStepDrawerProps>(
  function AddStepDrawer({ existingStepIds, onSave }, ref) {
    const drawerRef = useRef<AppDrawerRef>(null);
    const [stepId, setStepId] = React.useState('');
    const editIndexRef = React.useRef<number | undefined>(undefined);
    const { theme } = useTheme();
    const ts = createThemedStyles(theme);
    const { colors } = theme;

    useImperativeHandle(ref, () => ({
      open: (init?: AdminQuestStep | null, editIndex?: number) => {
        setStepId(init?.stepId ?? `step_${existingStepIds.length + 1}`);
        editIndexRef.current = editIndex;
        drawerRef.current?.open();
      },
    }));

    const handleSave = () => {
      const id = stepId.trim() || `step_${existingStepIds.length + 1}`;
      onSave({ stepId: id, requirements: {} }, editIndexRef.current);
      drawerRef.current?.close();
    };

    return (
      <AppDrawer ref={drawerRef} title="Quest Step" snapPoints={['90%']}>
        <View style={{ gap: 16 }}>
          <Field label="Step ID">
            <TextInput
              style={ts.input}
              value={stepId}
              onChangeText={(v) => setStepId(v.replace(/[^a-z0-9_]/gi, ''))}
              placeholder="step_1"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </Field>
          <Text style={[ts.fieldLabel, { color: colors.textMuted, fontSize: 11 }]}>
            Full step editor (requirements, dialog, rewards) coming soon. Use API for now.
          </Text>
          <Pressable onPress={handleSave} style={{ backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.onPrimary ?? '#fff' }}>Save</Text>
          </Pressable>
        </View>
      </AppDrawer>
    );
  },
);
