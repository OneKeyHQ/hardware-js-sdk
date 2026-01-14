import React, { createContext, useContext, useMemo, useState } from 'react';

import type { CommonParams } from '@onekeyfe/hd-core';

const defaultParams: CommonParams = {
  keepSession: false,
  retryCount: undefined,
  pollIntervalTime: undefined,
  timeout: undefined,
  passphraseState: '',
  initSession: false,
  detectBootloaderDevice: false,
  skipWebDevicePrompt: false,
  skipPassphraseCheck: false,
};

const CommonParamsContext = createContext<{
  commonParams: CommonParams;
  setCommonParams: React.Dispatch<React.SetStateAction<CommonParams>>;
}>({
  commonParams: defaultParams,
  setCommonParams: () => {},
});

export const useCommonParams = () => useContext(CommonParamsContext);

type CommonParamsProviderProps = {
  children: React.ReactNode;
};

export const CommonParamsProvider: React.FC<CommonParamsProviderProps> = ({ children }) => {
  const [commonParams, setCommonParams] = useState<CommonParams>(defaultParams);

  const providerValue = useMemo(
    () => ({
      commonParams,
      setCommonParams,
    }),
    [commonParams]
  );

  return (
    <CommonParamsContext.Provider value={providerValue}>{children}</CommonParamsContext.Provider>
  );
};
