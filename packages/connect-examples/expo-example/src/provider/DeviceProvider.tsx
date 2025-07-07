import React, { useMemo, memo } from 'react';

import { Stack } from 'tamagui';
import { useAtomValue } from 'jotai';
import { DeviceList } from '../components/DeviceList';
import { selectDeviceAtom } from '../atoms/deviceAtoms';

export const useDevice = () => {
  const selectedDevice = useAtomValue(selectDeviceAtom);
  return { selectedDevice };
};

function DeviceProviderContent({ children }: { children: React.ReactNode }) {
  const childMemo = useMemo(() => children, [children]);

  return (
    <Stack padding="$2">
      <DeviceList />
      {childMemo}
    </Stack>
  );
}

export const DeviceProvider = memo(DeviceProviderContent);
