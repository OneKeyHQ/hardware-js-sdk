import { Checkbox, Label, Stack } from 'tamagui';
import { Check as CheckIcon } from '@tamagui/lucide-icons';

export type SwitchInputProps = {
  value: boolean;
  onToggle: (value: boolean) => void;
  label: string;
  id?: string;
  vertical?: boolean;
};
export const SwitchInput = ({ id, value, onToggle, label, vertical }: SwitchInputProps) => {
  const refId = `switch-${label ?? ''}${id}`;

  return (
    <Stack
      alignItems="center"
      width={160}
      minHeight={45}
      flexDirection={vertical ? 'row' : 'column'}
      gap={vertical ? '$2' : '$0'}
    >
      <Label paddingRight="$0" justifyContent="flex-end" htmlFor={refId}>
        {label}
      </Label>
      <Checkbox id={refId} checked={value} onCheckedChange={onToggle} defaultChecked={false}>
        <Checkbox.Indicator>
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox>
    </Stack>
  );
};
