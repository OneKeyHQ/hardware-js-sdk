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
      <>
        <Stack gap="$2" alignItems="flex-end" marginTop="$2">
          <Button size="large" variant="primary" onPress={toggleExpandMode}>
            {intl.formatMessage({ id: 'action__change_expand_mode' })}
          </Button>
        </Stack>
        {contentContainer}
      </>
    </ExpandModeContext.Provider>
  );
};
