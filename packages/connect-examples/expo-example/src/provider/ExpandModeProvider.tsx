import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { Stack } from 'tamagui';
import { useIntl } from 'react-intl';
import { Button } from '../components/ui/Button';

const ExpandModeContext = createContext<boolean>(false);

export const useExpandMode = () => useContext(ExpandModeContext);

export const ExpandModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const intl = useIntl();
  const [isExpandMode, setIsExpandMode] = useState(false);
  const toggleExpandMode = useCallback(() => setIsExpandMode(pre => !pre), []);

  const providerValue = useMemo(() => isExpandMode, [isExpandMode]);

  const contentContainer = useMemo(() => children, [children]);

  return (
    <ExpandModeContext.Provider value={providerValue}>
      <Stack>
        <Button
          id="expand-mode-button"
          zIndex={100}
          position="absolute"
          top="$5"
          right="$3"
          variant="primary"
          onPress={toggleExpandMode}
        >
          {intl.formatMessage({ id: 'action__change_expand_mode' })}
        </Button>
        {contentContainer}
      </Stack>
    </ExpandModeContext.Provider>
  );
};
