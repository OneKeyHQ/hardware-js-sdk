import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Stack } from 'tamagui';
import { useIntl } from 'react-intl';

import { Button } from '../components/ui/Button';

import type { ReactNode } from 'react';

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
      <Stack gap="$2">
        <Button
          id="expand-mode-button"
          alignSelf="flex-end"
          marginHorizontal="$2"
          marginTop="$2"
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
