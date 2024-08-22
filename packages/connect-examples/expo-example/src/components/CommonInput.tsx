import { random } from 'lodash';
import { useCallback, useRef } from 'react';

import { Input, Label, Stack } from 'tamagui';

export type CommonInputProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  type?: 'number' | 'text';
};
export const CommonInput = ({ value, onChange, label, type, placeholder }: CommonInputProps) => {
  const onChangeCallback = useCallback(
    (text: string) => {
      if (type === 'number') {
        onChange(text.replace(/[^\d]+/, ''));
      } else {
        onChange(text);
      }
    },
    [onChange, type]
  );

  const idRef = useRef(`input-${random(1000, 10000)}`);

  return (
    <Stack width={160} minHeight={45}>
      <Label paddingRight="$0" justifyContent="center" htmlFor={idRef.current}>
        {label}
      </Label>
      <Input
        id={idRef.current}
        size="$4"
        height={34}
        keyboardType="numeric"
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeCallback}
      />
    </Stack>
  );
};
