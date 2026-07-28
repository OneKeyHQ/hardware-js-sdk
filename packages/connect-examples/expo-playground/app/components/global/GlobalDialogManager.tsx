import React, { useState } from 'react';
import PinDialog from './PinDialog';
import PassphraseDialog from './PassphraseDialog';

export type PassphraseDialogOptions = {
  existsAttachPinUser?: boolean;
};

// 声明全局弹窗管理器类型
declare global {
  interface Window {
    globalDialogManager?: {
      showPinDialog: () => void;
      showPassphraseDialog: (options?: PassphraseDialogOptions) => void;
      closeAllDialogs: () => void;
    };
  }
}

// 全局弹窗管理器 - 简化版本，直接管理弹窗状态
const GlobalDialogManager: React.FC = () => {
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [passphraseDialogOpen, setPassphraseDialogOpen] = useState(false);
  const [passphraseDialogOptions, setPassphraseDialogOptions] = useState<PassphraseDialogOptions>(
    {}
  );

  const handlePinClose = () => {
    console.log('[GlobalDialogManager] Close PIN dialog');
    setPinDialogOpen(false);
  };

  const handlePassphraseClose = () => {
    console.log('[GlobalDialogManager] Close Passphrase dialog');
    setPassphraseDialogOpen(false);
    setPassphraseDialogOptions({});
  };

  // 导出弹窗控制方法到全局
  React.useEffect(() => {
    // 将弹窗控制方法挂载到window对象，供SDKProvider调用
    window.globalDialogManager = {
      showPinDialog: () => {
        console.log('[GlobalDialogManager] Show PIN dialog');
        setPinDialogOpen(true);
      },
      showPassphraseDialog: options => {
        console.log('[GlobalDialogManager] Show Passphrase dialog');
        setPassphraseDialogOptions(options ?? {});
        setPassphraseDialogOpen(true);
      },
      closeAllDialogs: () => {
        console.log('[GlobalDialogManager] Close all dialogs');
        setPinDialogOpen(false);
        setPassphraseDialogOpen(false);
        setPassphraseDialogOptions({});
      },
    };

    // 清理
    return () => {
      delete window.globalDialogManager;
    };
  }, []);

  return (
    <>
      <PinDialog isOpen={pinDialogOpen} onClose={handlePinClose} />
      <PassphraseDialog
        isOpen={passphraseDialogOpen}
        onClose={handlePassphraseClose}
        existsAttachPinUser={passphraseDialogOptions.existsAttachPinUser}
      />
    </>
  );
};

export default GlobalDialogManager;
