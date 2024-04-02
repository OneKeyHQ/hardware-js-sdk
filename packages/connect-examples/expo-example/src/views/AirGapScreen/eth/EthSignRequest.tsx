import { Stack, Text } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  CryptoKeypath,
  DataType,
  ETHSignature,
  EthSignRequest,
  PathComponent,
  RegistryTypes,
} from '@onekeyfe/hd-air-gap-sdk';

import PanelView from '../../../components/ui/Panel';
import { Button } from '../../../components/ui/Button';
import { Routes } from '../../../route';
import AutoWrapperTextArea from '../../../components/ui/AutoWrapperTextArea';
import AutoQrCodeView from '../../../components/AutoQrCodeView';

export default function EthSignRequestView() {
  const navigation = useNavigation();
  const intl = useIntl();

  const [result, setResult] = useState<string>('');
  const [urData, setUrData] = useState<{
    type: string;
    cbor: string;
  }>();

  const generateTransaction = () => {
    const ethsign = new EthSignRequest({
      requestId: Buffer.from('03e3f7'),
      signData: Buffer.from('0x010203040506070809'), // 33 bytes
      dataType: DataType.personalMessage,
      chainId: 1,
      derivationPath: new CryptoKeypath([
        new PathComponent({ index: 44, hardened: true }),
        new PathComponent({ index: 60, hardened: true }),
        new PathComponent({ index: 0, hardened: true }),
        new PathComponent({ index: 0, hardened: false }),
        new PathComponent({ index: 0, hardened: false }),
      ]),
      address: undefined,
      origin: 'OneKey Test Demo',
    });

    const urEncoder = ethsign.toUREncoder();
    setUrData({
      type: ethsign.getRegistryType().getType(),
      cbor: urEncoder.cbor.toString('hex'),
    });
  };

  const onScanQrCode = () => {
    // @ts-expect-error
    navigation.navigate(Routes.Scan, {
      onScanComplete: (data: { type: string; cbor: string }) => {
        if (data.type !== RegistryTypes.ETH_SIGNATURE.getType()) {
          alert('Invalid QR code type');
          return;
        }
        const ethSignature = ETHSignature.fromCBOR(Buffer.from(data.cbor, 'hex'));
        const requestIdBuffer = ethSignature.getRequestId();
        const signature = ethSignature.getSignature();
        const r = signature.slice(0, 32);
        const s = signature.slice(32, 64);
        const v = signature.slice(64, 65);

        const log = [];
        log.push(`requestId: ${requestIdBuffer?.toString('hex')}`);
        log.push(`r: ${r.toString('hex')}`);
        log.push(`s: ${s.toString('hex')}`);
        log.push(`v: ${v.toString('hex')}`);

        setResult(log.join('\n'));
      },
    });
  };

  return (
    <PanelView title="EthSignRequest">
      <Stack>
        <Text fontSize={16} fontWeight="bold" marginTop="$1">
          {intl.formatMessage({ id: 'message__request_sign_generate_transaction' })}
        </Text>
        <Button onPress={generateTransaction}>Generate Transaction QR Code</Button>
        <AutoQrCodeView type={urData?.type ?? ''} cbor={urData?.cbor ?? ''} />
      </Stack>

      <Stack>
        <Text fontSize={16} fontWeight="bold" marginTop="$1">
          {intl.formatMessage({ id: 'message__request_sign_sign_on_device' })}
        </Text>
      </Stack>

      <Stack>
        <Text fontSize={16} fontWeight="bold" marginTop="$1">
          {intl.formatMessage({ id: 'message__request_sign_get_signature_on_hardware' })}
        </Text>
        <Button onPress={onScanQrCode}>
          {intl.formatMessage({ id: 'message__scan_qr_code' })}
        </Button>
      </Stack>

      <Stack>
        <Stack flexDirection="row" justifyContent="space-between">
          <Text fontSize={16} fontWeight="bold" marginTop="$1">
            {intl.formatMessage({ id: 'label__response' })}
          </Text>
        </Stack>
        <AutoWrapperTextArea
          marginTop="$2"
          marginHorizontal="$2"
          marginBottom="$2"
          value={result}
          placeholder={intl.formatMessage({ id: 'label__will_response_tip' })}
          editable={false}
        />
      </Stack>
    </PanelView>
  );
}
