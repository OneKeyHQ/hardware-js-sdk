import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Alert, AlertDescription } from '../ui/Alert';
import { ONEKEY_WEBUSB_FILTER } from '@onekeyfe/hd-shared';
import { Usb, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export type WebUsbAuthorizeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (device: USBDevice) => void;
  onCancel?: () => void;
};

/**
 * WebUSB authorization modal with improved UX and visual design.
 * The "Select Device" button calls navigator.usb.requestDevice directly in onClick
 * to satisfy Chrome's user gesture requirement.
 */
const WebUsbAuthorizeDialog: React.FC<WebUsbAuthorizeDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-sm sm:max-w-md bg-background p-6 mx-auto"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        {/* Header with icon */}
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 rounded-full bg-primary/10 p-2">
            <Usb className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-lg font-semibold mb-1">
              {t('firmware.webusb.authorize.title', 'Authorize WebUSB')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t(
                'firmware.webusb.authorize.description',
                'Your device switched to bootloader mode to apply the update. Chrome treats this as a new USB device. Please authorize it to continue the firmware update.'
              )}
            </DialogDescription>
          </div>
        </div>

        {/* Helpful tips */}
        <Alert className="mb-3 bg-muted/40 border-border/60 py-2">
          <AlertDescription className="text-xs flex items-start gap-2 text-foreground/80">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-foreground/60" />
            <span>
              {t(
                'firmware.webusb.authorize.tip',
                'Ensure your device is connected. If the chooser does not appear, try a different USB port or reconnect the cable.'
              )}
            </span>
          </AlertDescription>
        </Alert>

        {/* Buttons */}
        <DialogFooter className="mt-2 items-center sm:justify-center">
          <Button
            className="h-10"
            disabled={loading}
            onClick={async () => {
              // Direct call in the click handler to satisfy Chrome's user gesture requirement
              try {
                setLoading(true);
                if (!navigator?.usb) {
                  throw new Error('WebUSB not supported by this browser');
                }
                const device = await navigator.usb.requestDevice({ filters: ONEKEY_WEBUSB_FILTER });
                onSuccess(device);
                onOpenChange(false);
              } catch (e) {
                // Keep dialog open; user can close with X or try again
                onCancel?.();
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('firmware.webusb.authorize.selecting', 'Selecting...')}
              </span>
            ) : (
              t('firmware.webusb.authorize.selectButton', 'Select Device')
            )}
          </Button>
        </DialogFooter>

        {/* Subtext / troubleshooting */}
        <div className="mt-3 text-[11px] text-muted-foreground flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5" />
          <p>
            {t(
              'firmware.webusb.authorize.troubleshooting',
              'If you close this dialog or dismiss the chooser, the update will pause. Reopen this dialog to continue when ready.'
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebUsbAuthorizeDialog;
