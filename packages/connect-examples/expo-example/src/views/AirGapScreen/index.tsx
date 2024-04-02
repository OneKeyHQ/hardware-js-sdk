import { Stack } from 'tamagui';
import PageView from '../../components/ui/Page';

import CryptoHDKeyView from './CryptoHDKey';
import EthSignRequestView from './eth/EthSignRequest';

export default function AirGapScreen() {
  return (
    <PageView>
      <Stack padding="$2">
        <CryptoHDKeyView />
        <EthSignRequestView />
      </Stack>
    </PageView>
  );
}
