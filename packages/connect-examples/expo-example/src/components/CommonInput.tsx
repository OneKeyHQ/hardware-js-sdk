import { useCallback } from 'react';

import { Input, Label, Stack } from 'tamagui';

export type CommonInputProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  type?: 'number' | 'text';
};
export const CommonInput = ({ value, onChange, label, type }: CommonInputProps) => {
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
  const id = `switch-${label ?? ''}}`;

  return (
    <Stack width={160} minHeight={45}>
      <Label paddingRight="$0" justifyContent="center" htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        size="$4"
        height={34}
        keyboardType="numeric"
        value={value}
        onChangeText={onChangeCallback}
      />
    </Stack>
  );
};
