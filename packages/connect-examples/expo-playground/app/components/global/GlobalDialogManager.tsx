import React, { useState } from 'react';
import PinDialog from './PinDialog';
import PassphraseDialog from './PassphraseDialog';
import type { UiResponseCorrelation } from '@onekeyfe/hd-core';

// 声明全局弹窗管理器类型
declare global {
  interface Window {
    globalDialogManager?: {
      showPinDialog: (responseCorrelation?: UiResponseCorrelation) => void;
      showPassphraseDialog: (responseCorrelation?: UiResponseCorrelation) => void;
      closePinDialog: () => void;
      closePassphraseDialog: () => void;
      closeAllDialogs: () => void;
    };
  }
}

// 全局弹窗管理器 - 简化版本，直接管理弹窗状态
const GlobalDialogManager: React.FC = () => {
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [passphraseDialogOpen, setPassphraseDialogOpen] = useState(false);
  const [pinResponseCorrelation, setPinResponseCorrelation] = useState<UiResponseCorrelation>();
  const [passphraseResponseCorrelation, setPassphraseResponseCorrelation] =
    useState<UiResponseCorrelation>();

  const handlePinClose = () => {
    console.log('[GlobalDialogManager] Close PIN dialog');
    setPinDialogOpen(false);
    setPinResponseCorrelation(undefined);
  };

  const handlePassphraseClose = () => {
    console.log('[GlobalDialogManager] Close Passphrase dialog');
    setPassphraseDialogOpen(false);
    setPassphraseResponseCorrelation(undefined);
  };

  // 导出弹窗控制方法到全局
  React.useEffect(() => {
    // 将弹窗控制方法挂载到window对象，供SDKProvider调用
    window.globalDialogManager = {
      showPinDialog: responseCorrelation => {
        console.log('[GlobalDialogManager] Show PIN dialog');
        setPassphraseDialogOpen(false);
        setPassphraseResponseCorrelation(undefined);
        setPinResponseCorrelation(responseCorrelation);
        setPinDialogOpen(true);
      },
      showPassphraseDialog: responseCorrelation => {
        console.log('[GlobalDialogManager] Show Passphrase dialog');
        setPinDialogOpen(false);
        setPinResponseCorrelation(undefined);
        setPassphraseResponseCorrelation(responseCorrelation);
        setPassphraseDialogOpen(true);
      },
      closePinDialog: handlePinClose,
      closePassphraseDialog: handlePassphraseClose,
      closeAllDialogs: () => {
        console.log('[GlobalDialogManager] Close all dialogs');
        setPinDialogOpen(false);
        setPassphraseDialogOpen(false);
        setPinResponseCorrelation(undefined);
        setPassphraseResponseCorrelation(undefined);
      },
    };

    // 清理
    return () => {
      delete window.globalDialogManager;
    };
  }, []);

  return (
    <>
      <PinDialog
        isOpen={pinDialogOpen}
        onClose={handlePinClose}
        responseCorrelation={pinResponseCorrelation}
      />
      <PassphraseDialog
        isOpen={passphraseDialogOpen}
        onClose={handlePassphraseClose}
        responseCorrelation={passphraseResponseCorrelation}
      />
    </>
  );
};

export default GlobalDialogManager;
