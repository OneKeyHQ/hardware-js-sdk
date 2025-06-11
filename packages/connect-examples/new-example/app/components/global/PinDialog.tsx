import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { submitPin } from "../../services/hardwareService";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/Dialog";
import { Button } from "../ui/Button";

interface PinDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PinDialog: React.FC<PinDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState("");

  // OneKey设备的PIN键盘映射 - 3x3布局
  const keyboardMap = [
    [7, 8, 9],
    [4, 5, 6],
    [1, 2, 3],
  ];

  const handleKeyPress = (number: number) => {
    setPin((prev) => prev + number.toString());
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!pin) return;

    try {
      await submitPin(pin);
      setPin("");
      onClose();
    } catch (error) {
      console.error("PIN提交失败:", error);
    }
  };

  const handleUseDevice = async () => {
    try {
      await submitPin("@@ONEKEY_INPUT_PIN_IN_DEVICE");
      setPin("");
      onClose();
    } catch (error) {
      console.error("设备PIN输入失败:", error);
    }
  };

  const handleCancel = async () => {
    try {
      await submitPin(null);
      setPin("");
      onClose();
    } catch (error) {
      console.error("PIN取消失败:", error);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setPin("");
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel();
        }
      }}
    >
      <DialogContent
        className="w-[400px] bg-white rounded-3xl p-0 border-0 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCancel();
        }}
      >
        {/* 头部信息区域 */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-gray-900 mb-2">
                {t("pin.enterPin", "输入PIN码")}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 leading-relaxed">
                {t("pin.checkDeviceLayout", "请查看设备屏幕上的键盘布局。")}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* 整体键盘区域 */}
        <div className="px-6 pb-6">
          {/* PIN输入显示框 */}
          <div className="w-full h-12 rounded-none rounded-t-lg bg-gray-50 border border-gray-200 flex items-center justify-center mb-0.5">
            <span className="text-xl tracking-[0.4em] font-mono text-gray-800">
              {pin.replace(/./g, "●")}
            </span>
          </div>

          {/* 3x3数字键盘 - 只有最外角有圆角 */}
          <div className="grid grid-cols-3 gap-0.5 mb-0.5">
            {keyboardMap.flat().map((number) => {
              return (
                <Button
                  key={number}
                  variant="ghost"
                  className={`w-full h-14 bg-gray-100 hover:bg-gray-200 transition-all duration-150 rounded-none  `}
                  onClick={() => handleKeyPress(number)}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-800" />
                </Button>
              );
            })}
          </div>

          {/* 底部功能按钮行 - 左下角和右下角有圆角 */}
          <div className="grid grid-cols-3 gap-0.5 mb-4">
            {/* 删除按钮 - 整个键盘左下角 */}
            <Button
              variant="ghost"
              className="h-14 rounded-none rounded-bl-lg bg-gray-500 hover:bg-gray-600 text-white transition-all duration-150"
              onClick={handleBackspace}
              disabled={pin.length === 0}
              title="删除最后一位数字"
            >
              <span className="text-xl">⌫</span>
            </Button>

            {/* 数字0按钮 */}
            <Button
              variant="ghost"
              className="h-14 bg-gray-100 hover:bg-gray-200 transition-all duration-150 rounded-none"
              onClick={() => handleKeyPress(0)}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-gray-800" />
            </Button>

            {/* 确认按钮 - 整个键盘右下角 */}
            <Button
              variant="ghost"
              className="h-14 rounded-none rounded-br-lg bg-gray-800 hover:bg-gray-700 text-white transition-all duration-150"
              onClick={handleSubmit}
              disabled={pin.length === 0}
              title="确认并提交PIN码"
            >
              <span className="text-xl text-white">✓</span>
            </Button>
          </div>

          {/* 设备输入选项 - 与键盘同宽 */}
          <Button
            variant="ghost"
            onClick={handleUseDevice}
            className="w-full text-gray-500 hover:text-gray-700 text-base font-medium h-12 px-4 hover:bg-gray-50 rounded-lg transition-all duration-150"
            title="在硬件设备上直接输入PIN码"
          >
            {t("pin.deviceInput", "在设备上输入")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinDialog;
