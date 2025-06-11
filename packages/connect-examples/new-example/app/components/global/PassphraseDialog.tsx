import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { submitPassphrase } from "../../services/hardwareService";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Checkbox } from "../ui/Checkbox";
import { Alert, AlertDescription } from "../ui/Alert";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

interface PassphraseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PassphraseDialog: React.FC<PassphraseDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [savePassphrase, setSavePassphrase] = useState(true);
  const [showPassphrase, setShowPassphrase] = useState(false);

  const handleSubmit = async () => {
    // 验证两次输入是否一致
    if (passphrase !== confirmPassphrase) {
      // TODO: 可以添加toast提示
      return;
    }

    try {
      await submitPassphrase(passphrase, false, savePassphrase);

      resetState();
      onClose();
    } catch (error) {
      console.error("Passphrase提交失败:", error);
    }
  };

  const handleCancel = async () => {
    try {
      await submitPassphrase("", false, false);
      resetState();
      onClose();
    } catch (error) {
      console.error("Passphrase取消失败:", error);
    }
  };

  const handleUseDevice = async () => {
    try {
      await submitPassphrase("", true, savePassphrase);
      resetState();
      onClose();
    } catch (error) {
      console.error("使用设备输入失败:", error);
    }
  };

  // 重置状态函数
  const resetState = () => {
    setPassphrase("");
    setConfirmPassphrase("");
    setSavePassphrase(true);
    setShowPassphrase(false);
  };

  // 每次打开时重置状态
  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const isFormValid = passphrase && passphrase === confirmPassphrase;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="w-96 bg-background p-6 max-w-sm mx-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* 头部区域 */}
        <div className="text-center mb-4">
          <DialogTitle className="text-lg font-semibold mb-1">
            {t("passphrase.title", "输入 Passphrase")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t(
              "passphrase.webInputDescription",
              "在网页上输入passphrase以继续"
            )}
          </DialogDescription>
        </div>

        {/* 警告提示 - 简化 */}
        <Alert className="mb-3 bg-orange-50 border-orange-200 py-2">
          <AlertTriangle className="h-3 w-3 text-orange-600" />
          <AlertDescription className="text-orange-800 text-xs">
            {t("passphrase.warningMessage", "Passphrase 遗失将无法恢复")}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {/* Passphrase 输入区域 */}
          <div className="space-y-2">
            <label
              htmlFor="passphrase-input"
              className="text-sm font-medium text-foreground"
            >
              Passphrase
            </label>
            <div className="relative">
              <Input
                id="passphrase-input"
                name="device-passphrase"
                type={showPassphrase ? "text" : "password"}
                placeholder={t("passphrase.placeholder", "请输入passphrase")}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="h-10 pr-10"
                maxLength={50}
                autoComplete="off"
                data-1p-ignore="true"
                data-form-type="other"
                spellCheck="false"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* 确认 Passphrase */}
          <div className="space-y-2">
            <label
              htmlFor="confirm-passphrase"
              className="text-sm font-medium text-foreground"
            >
              {t("passphrase.confirmPassphrase", "确认 passphrase")}
            </label>
            <div className="relative">
              <Input
                id="confirm-passphrase"
                name="device-passphrase-confirm"
                type={showPassphrase ? "text" : "password"}
                placeholder={t(
                  "passphrase.confirmPlaceholder",
                  "请再次输入passphrase"
                )}
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                className="h-10 pr-10"
                autoComplete="off"
                data-1p-ignore="true"
                data-form-type="other"
                spellCheck="false"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* 保存选项  */}
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="save-passphrase"
              checked={savePassphrase}
              onCheckedChange={(checked) => setSavePassphrase(checked === true)}
            />
            <label
              htmlFor="save-passphrase"
              className="text-xs text-foreground cursor-pointer flex-1"
            >
              {t("passphrase.saveToSession", "保持可访问")}
            </label>
          </div>

          {/* 按钮区域 - 紧凑布局 */}
          <div className="space-y-2 pt-3">
            {/* 主要操作按钮 */}
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className="w-full h-10 bg-gray-800 hover:bg-gray-700 text-white"
            >
              {t("common.confirm", "确认")}
            </Button>

            {/* 次要操作 - 合并为一行 */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleUseDevice}
                className="flex-1 h-10 text-gray-600 border-gray-300 text-sm"
              >
                {t("passphrase.inputOnDevice", "在设备上输入")}
              </Button>

              <Button
                variant="ghost"
                onClick={handleCancel}
                className="flex-1 h-10 text-gray-500 hover:text-gray-700 text-sm"
              >
                {t("common.cancel", "取消")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PassphraseDialog;
