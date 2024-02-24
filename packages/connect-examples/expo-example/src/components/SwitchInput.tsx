import { Checkbox, Label, Stack } from 'tamagui';
import { Check as CheckIcon } from '@tamagui/lucide-icons';
import { random } from 'lodash';
import { useRef } from 'react';

export type SwitchInputProps = {
  value: boolean;
  onToggle: (value: boolean) => void;
  label: string;
  vertical?: boolean;
};
export const SwitchInput = ({ value, onToggle, label, vertical }: SwitchInputProps) => {
  const idRef = useRef(`switch-${random(100, 10000)}`);
  return (
    <Stack
      alignItems="center"
      width={160}
      minHeight={45}
      flexDirection={vertical ? 'row' : 'column'}
      gap={vertical ? '$2' : '$0'}
    >
      <Label paddingRight="$0" justifyContent="flex-end" htmlFor={idRef.current}>
        {label}
      </Label>
      <Checkbox
        id={idRef.current}
        checked={value}
        onCheckedChange={onToggle}
        defaultChecked={false}
      >
        <Checkbox.Indicator>
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox>
    </Stack>
  );
};
