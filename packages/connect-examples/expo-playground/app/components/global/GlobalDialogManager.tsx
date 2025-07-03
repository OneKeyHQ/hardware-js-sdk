import React, { useState } from "react";
import PinDialog from "./PinDialog";
import PassphraseDialog from "./PassphraseDialog";

// 声明全局弹窗管理器类型
declare global {
  interface Window {
    globalDialogManager?: {
      showPinDialog: () => void;
      showPassphraseDialog: () => void;
      closeAllDialogs: () => void;
    };
  }
}

// 全局弹窗管理器 - 简化版本，直接管理弹窗状态
const GlobalDialogManager: React.FC = () => {
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [passphraseDialogOpen, setPassphraseDialogOpen] = useState(false);

  const handlePinClose = () => {
    console.log("[GlobalDialogManager] 🚪 关闭PIN弹窗");
    setPinDialogOpen(false);
  };

  const handlePassphraseClose = () => {
    console.log("[GlobalDialogManager] 🚪 关闭Passphrase弹窗");
    setPassphraseDialogOpen(false);
  };

  // 导出弹窗控制方法到全局
  React.useEffect(() => {
    // 将弹窗控制方法挂载到window对象，供SDKProvider调用
    window.globalDialogManager = {
      showPinDialog: () => {
        console.log("[GlobalDialogManager] 📱 显示PIN输入弹窗");
        setPinDialogOpen(true);
      },
      showPassphraseDialog: () => {
        console.log("[GlobalDialogManager] 📱 显示passPhrase弹窗");
        setPassphraseDialogOpen(true);
      },
      closeAllDialogs: () => {
        console.log("[GlobalDialogManager] 🚪 关闭所有弹窗");
        setPinDialogOpen(false);
        setPassphraseDialogOpen(false);
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
      />
    </>
  );
};

export default GlobalDialogManager;
