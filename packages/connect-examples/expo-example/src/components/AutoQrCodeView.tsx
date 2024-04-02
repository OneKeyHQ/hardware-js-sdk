/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { UR } from '@ngraveio/bc-ur';
import { UREncoder } from '@onekeyfe/hd-air-gap-sdk';
import QRCode from './QrCodeView';

export type AutoQrCodeViewProps = {
  delay?: number;
  type: string;
  cbor: string;
};

const AutoQrCodeView: FC<AutoQrCodeViewProps> = ({ delay = 250, type, cbor }) => {
  const urEncoder = useMemo(
    // For NGRAVE ZERO support please keep to a maximum fragment size of 200
    () => {
      if (!type || !cbor) {
        return undefined;
      }
      return new UREncoder(new UR(Buffer.from(cbor, 'hex'), type), 100);
    },
    [cbor, type]
  );

  const [currentQRCode, setCurrentQRCode] = useState(urEncoder?.nextPart());

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentQRCode(urEncoder?.nextPart());
    }, delay);
    return () => {
      clearInterval(id);
    };
  }, [delay, urEncoder]);

  console.log('currentQRCode', currentQRCode);

  return currentQRCode && <QRCode size={350} value={currentQRCode.toUpperCase()} />;
};

export default AutoQrCodeView;
