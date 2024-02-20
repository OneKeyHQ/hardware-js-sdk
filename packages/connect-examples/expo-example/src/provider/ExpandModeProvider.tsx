import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'tamagui';
import { Button } from '../components/ui/Button';

const ExpandModeContext = createContext<boolean>(false);

export const useExpandMode = () => useContext(ExpandModeContext);

export const ExpandModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isExpandMode, setIsExpandMode] = useState(false);
  const toggleExpandMode = useCallback(() => setIsExpandMode(pre => !pre), []);

  const providerValue = useMemo(() => isExpandMode, [isExpandMode]);

  const contentContainer = useMemo(() => children, [children]);

  return (
    <ExpandModeContext.Provider value={providerValue}>
      <>
        <Stack
          gap="$2"
          flexDirection={Platform.OS === 'web' ? 'row' : 'column'}
          flexWrap="wrap"
          marginTop="$2"
        >
          <Button size="large" onPress={toggleExpandMode}>
            Change ExpandMode
          </Button>
        </Stack>
        {contentContainer}
      </>
    </ExpandModeContext.Provider>
  );
};
