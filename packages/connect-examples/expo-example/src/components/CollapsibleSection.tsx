import React, { ReactNode, useEffect, useState } from 'react';
import { H4, Stack } from 'tamagui';
import { ChevronDownCircle, ChevronUpCircle } from '@tamagui/lucide-icons';
import { useExpandMode } from '../provider/ExpandModeProvider';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const isExpandMode = useExpandMode();

  useEffect(() => {
    setIsCollapsed(isExpandMode);
  }, [isExpandMode]);

  return (
    <Stack overflow="hidden" borderBottomColor="$border" borderBottomWidth="$px">
      <Stack
        backgroundColor="$bgApp"
        height="$16"
        onPress={() => setIsCollapsed(!isCollapsed)}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        alignContent="center"
      >
        <H4 fontWeight="bold">{title}</H4>
        {isCollapsed ? <ChevronDownCircle /> : <ChevronUpCircle />}
      </Stack>

      {!!isCollapsed && (
        <Stack gap="$1" backgroundColor="$bgInfoSubdued">
          {children}
        </Stack>
      )}
    </Stack>
  );
};
