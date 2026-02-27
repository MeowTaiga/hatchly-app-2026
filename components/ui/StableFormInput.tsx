/**
 * Text input that keeps local state during typing to avoid parent re-renders
 * overwriting the value. Syncs to parent on change and accepts external updates
 * (e.g. form load) without deleting in-progress typing.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

interface StableFormInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (v: string) => void;
}

export function StableFormInput({ value, onChangeText, ...rest }: StableFormInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const lastSentRef = useRef(value);

  const handleChange = useCallback(
    (v: string) => {
      lastSentRef.current = v;
      setLocalValue(v);
      onChangeText(v);
    },
    [onChangeText],
  );

  useEffect(() => {
    if (value !== lastSentRef.current) {
      lastSentRef.current = value;
      setLocalValue(value);
    }
  }, [value]);

  return <TextInput {...rest} value={localValue} onChangeText={handleChange} />;
}
