import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { submitPassphrase, cancelHardwareOperation } from '../../services/hardwareService';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert, AlertDescription } from '../ui/Alert';
import { Eye, EyeOff } from 'lucide-react';

interface PassphraseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deviceOnly?: boolean;
  allowAttachPin?: boolean;
  allowProtocolV2Utf8?: boolean;
}

const PASSPHRASE_PATTERN = /^[\x20-\x7e]{1,50}$/;

const isProtocolV2PassphraseValid = (value: string) => {
  const normalized = value.normalize('NFKD');
  return (
    Boolean(normalized) &&
    !normalized.includes('\0') &&
    new TextEncoder().encode(normalized).length <= 50
  );
};

const PassphraseDialog: React.FC<PassphraseDialogProps> = ({
  isOpen,
  onClose,
  deviceOnly = false,
  allowAttachPin = false,
  allowProtocolV2Utf8 = false,
}) => {
  const { t } = useTranslation();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);

  const handleSubmit = async () => {
    const valid = allowProtocolV2Utf8
      ? isProtocolV2PassphraseValid(passphrase)
      : PASSPHRASE_PATTERN.test(passphrase);
    if (!valid || passphrase !== confirmPassphrase) {
      // TODO: 可以添加toast提示
      return;
    }

    try {
      await submitPassphrase(
        allowProtocolV2Utf8 ? passphrase.normalize('NFKD') : passphrase,
        false
      );
      resetState();
      onClose();
    } catch (error) {
      console.error('Passphrase submit failed:', error);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelHardwareOperation();
    } finally {
      resetState();
      onClose();
    }
  };

  const handleUseDevice = async () => {
    try {
      await submitPassphrase('', true);
      resetState();
      onClose();
    } catch (error) {
      console.error('Device input failed:', error);
    }
  };

  const handleUseAttachPin = async () => {
    try {
      await submitPassphrase('', false, false, true);
      resetState();
      onClose();
    } catch (error) {
      console.error('Attach PIN selection failed:', error);
    }
  };

  // 重置状态函数
  const resetState = () => {
    setPassphrase('');
    setConfirmPassphrase('');
    setShowPassphrase(false);
  };

  // 每次打开时重置状态
  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const isPassphraseValid = allowProtocolV2Utf8
    ? isProtocolV2PassphraseValid(passphrase)
    : PASSPHRASE_PATTERN.test(passphrase);
  const isFormValid = isPassphraseValid && passphrase === confirmPassphrase;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-sm box-border bg-background p-5 sm:p-6"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        {/* 头部区域 */}
        <div className="text-center mb-4">
          <DialogTitle className="text-lg font-semibold mb-1">
            {t('passphrase.title', 'Enter Passphrase')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {deviceOnly
              ? t('passphrase.inputOnDevice', 'Enter on device')
              : t('passphrase.webInputDescription', 'Enter passphrase on web to continue')}
          </DialogDescription>
        </div>

        {/* 警告提示 - 简化 */}
        <Alert className="w-full max-w-full min-w-0 box-border mb-3 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 py-2">
          <AlertDescription className="min-w-0 break-words text-orange-800 dark:text-orange-200 text-xs">
            {t('passphrase.warningMessage', 'Lost passphrase cannot be recovered')}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {/* Passphrase 输入区域 */}
          {!deviceOnly ? (
            <div className="space-y-2">
              <label htmlFor="passphrase-input" className="text-sm font-medium text-foreground">
                Passphrase
              </label>
              <div className="relative">
                <Input
                  id="passphrase-input"
                  name="device-passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  placeholder={t('passphrase.placeholder', 'Enter passphrase')}
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
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
                  {showPassphrase ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          ) : null}

          {/* 确认 Passphrase */}
          {!deviceOnly ? (
            <div className="space-y-2">
              <label htmlFor="confirm-passphrase" className="text-sm font-medium text-foreground">
                {t('passphrase.confirmPassphrase', 'Confirm Passphrase')}
              </label>
              <div className="relative">
                <Input
                  id="confirm-passphrase"
                  name="device-passphrase-confirm"
                  type={showPassphrase ? 'text' : 'password'}
                  placeholder={t('passphrase.confirmPlaceholder', 'Re-enter passphrase')}
                  value={confirmPassphrase}
                  onChange={e => setConfirmPassphrase(e.target.value)}
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
                  {showPassphrase ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          ) : null}

          {!deviceOnly && passphrase && !isPassphraseValid ? (
            <p className="text-xs text-destructive">
              {allowProtocolV2Utf8
                ? 'Use 1–50 UTF-8 bytes without NUL'
                : 'Use 1–50 printable ASCII characters'}
            </p>
          ) : null}

          {/* 按钮区域 - 紧凑布局 */}
          <div className="space-y-2 pt-3">
            {/* 主要操作按钮 */}
            {!deviceOnly ? (
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid}
                className="w-full h-10 bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300 border-none shadow-none"
              >
                {t('common.confirm', 'Confirm')}
              </Button>
            ) : null}

            {/* 次要操作 - 合并为一行 */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleUseDevice}
                className="min-w-0 w-full h-10 whitespace-normal border border-neutral-300 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white text-sm shadow-none"
              >
                {t('passphrase.inputOnDevice', 'Enter on device')}
              </Button>

              {allowAttachPin ? (
                <Button
                  variant="outline"
                  onClick={handleUseAttachPin}
                  className="min-w-0 w-full h-10 whitespace-normal"
                >
                  Attach PIN
                </Button>
              ) : null}

              <Button
                variant="ghost"
                onClick={handleCancel}
                className={`min-w-0 w-full h-10 whitespace-normal text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-white text-sm shadow-none ${
                  allowAttachPin ? 'col-span-2' : ''
                }`}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PassphraseDialog;
