import { Stack, Text } from 'tamagui';
// @ts-expect-error
import HDKey from 'hdkey';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { CryptoHDKey } from '@onekeyfe/hd-air-gap-sdk';

import { bytesToHex } from '@noble/hashes/utils';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import PanelView from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { Routes } from '../../route';
import AutoWrapperTextArea from '../../components/ui/AutoWrapperTextArea';

export default function CryptoHDKeyView() {
  const navigation = useNavigation();
  const intl = useIntl();

  const [result, setResult] = useState<string>('');

  const onScanQrCode = () => {
    // @ts-expect-error
    navigation.navigate(Routes.Scan, {
      onScanComplete: (data: { type: string; cbor: string }) => {
        const hdKey = CryptoHDKey.fromCBOR(Buffer.from(data.cbor, 'hex'));
        const path = hdKey.getOrigin()?.getPath();
        const xpub = hdKey.getBip32Key();
        const extendPubKey = hdKey.getKey();
        const chainCode = hdKey.getChainCode();
        const childrenPath = hdKey.getChildren()?.getPath() ?? '0/*';
        const derivePath = `m/${childrenPath}`.replace('*', '0');

        if (!path) return;
        if (!extendPubKey) return;
        if (!chainCode) return;

        const node = HDKey.fromExtendedKey(xpub);
        const publicKey = node.derive(derivePath);
        const hash = bytesToHex(keccak256(publicKey.publicKey.slice(1)));
        const address = `0x${hash.slice(-40)}`;

        const log = [];
        log.push(`origin path: ${path}`);
        log.push(`extendPubKey: ${extendPubKey.toString('hex')}`);
        log.push(`getChainCode: ${chainCode.toString('hex')}`);
        log.push(`xpub: ${xpub}`);
        log.push('');
        log.push(`child path: ${derivePath}`);
        log.push(`publicKey: ${publicKey.publicKey.toString('hex')}`);
        log.push(`address: ${address}`);

        setResult(log.join('\n'));
      },
    });
  };

  return (
    <PanelView title="CryptoHDKey">
      <Stack>
        <Text fontSize={16} fontWeight="bold" marginTop="$1">
          {intl.formatMessage({ id: 'message__get_the_account_on_hardware' })}
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
