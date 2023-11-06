import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { Button, Platform, Switch, Text, View } from 'react-native';

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
        <View
          style={{
            flexDirection: Platform.OS === 'web' ? 'row' : 'column',
            flexWrap: 'wrap',
            marginTop: 12,
          }}
        >
          <Button title="Change ExpandMode" onPress={toggleExpandMode} />
        </View>
        {contentContainer}
      </>
    </ExpandModeContext.Provider>
  );
};
