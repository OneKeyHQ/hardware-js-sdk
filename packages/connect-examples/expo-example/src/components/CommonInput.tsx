import { random } from 'lodash';
import { useCallback, useRef } from 'react';

import { Input, Label, Stack } from 'tamagui';

export type CommonInputProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  type?: 'number' | 'text';
  onBlur?: () => void;
  defaultValue?: string;
};
export const CommonInput = ({
  value,
  onChange,
  label,
  type,
  placeholder,
  onBlur,
  defaultValue,
}: CommonInputProps) => {
  const onChangeCallback = useCallback(
    (text: string) => {
      if (type === 'number') {
        // Allow empty string and only digits
        const numericText = text.replace(/[^\d]/g, '');
        onChange(numericText);
      } else {
        onChange(text);
      }
    },
    [type, onChange]
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
        inputMode={type === 'number' ? 'numeric' : 'text'}
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeCallback}
        onBlur={onBlur}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      />
    </Stack>
  );
};
