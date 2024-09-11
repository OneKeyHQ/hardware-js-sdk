import React from 'react';
import { FlatList } from 'react-native';
import { Stack, YStack } from 'tamagui';

import { useIntl } from 'react-intl';
import PageView from '../components/ui/Page';
import HandleSDKEvents from '../components/HandleSDKEvents';
import { DeviceProvider } from '../provider/DeviceProvider';
import { CommonParamsProvider } from '../provider/CommonParamsProvider';
import CommonParamsView from '../components/CommonParamsView';
import { UploadScreen } from '../components/UploadScreen';
import ChangeScreenComponent from '../components/ChangeScreen';
import { ExpandModeProvider } from '../provider/ExpandModeProvider';
import { CollapsibleSection } from '../components/CollapsibleSection';
import Playground, { PlaygroundProps as ApiPayloadProps } from '../components/Playground';
import PanelView from '../components/ui/Panel';

/* eslint-disable global-require, @typescript-eslint/no-var-requires */
const playgroundConfig = [
  {
    title: 'Basic API',
    data: require('../data/basic').default,
  },
  {
    title: 'Device API',
    data: require('../data/device').default,
  },
  {
    title: 'AllNetwork API',
    data: require('../data/allnetwork').default,
  },
  {
    title: 'Bitcoin API',
    data: require('../data/bitcoin').default,
  },
  {
    title: 'Ethereum API',
    data: require('../data/ethereum').default,
  },
  {
    title: 'Alephium API',
    data: require('../data/alephium').default,
  },
  {
    title: 'Algo API',
    data: require('../data/algo').default,
  },
  {
    title: 'Aptos API',
    data: require('../data/aptos').default,
  },
  {
    title: 'Cardano API',
    data: require('../data/cardano').default,
  },
  {
    title: 'Conflux API',
    data: require('../data/conflux').default,
  },
  {
    title: 'Cosmos API',
    data: require('../data/cosmos').default,
  },
  {
    title: 'Dynex API',
    data: require('../data/dynex').default,
  },
  {
    title: 'Filecoin API',
    data: require('../data/filecoin').default,
  },
  {
    title: 'Lightning Network API',
    data: require('../data/lightning').default,
  },
  {
    title: 'Kaspa API',
    data: require('../data/kaspa').default,
  },
  {
    title: 'Near API',
    data: require('../data/near').default,
  },
  {
    title: 'Nem API',
    data: require('../data/nem').default,
  },
  {
    title: 'Nervos API',
    data: require('../data/nervos').default,
  },
  {
    title: 'Nexa API',
    data: require('../data/nexa').default,
  },
  {
    title: 'Nostr API',
    data: require('../data/nostr').default,
  },
  {
    title: 'Polkadot API',
    data: require('../data/polkadot').default,
  },
  {
    title: 'Ripple API',
    data: require('../data/ripple').default,
  },
  {
    title: 'Scdo API',
    data: require('../data/scdo').default,
  },
  {
    title: 'Solana API',
    data: require('../data/solana').default,
  },
  {
    title: 'Starcoin API',
    data: require('../data/starcoin').default,
  },
  {
    title: 'Stellar API',
    data: require('../data/stellar').default,
  },
  {
    title: 'Sui API',
    data: require('../data/sui').default,
  },
  {
    title: 'TON API',
    data: require('../data/ton').default,
  },
  {
    title: 'TRON API',
    data: require('../data/tron').default,
  },
];

function renderItem({ item }: { item: { title: string; data: any } }) {
  console.log();
  return (
    <CollapsibleSection title={item.title}>
      <YStack flexDirection="column" $gtSm={{ flexDirection: 'row' }} flexWrap="wrap" gap="$2">
        {item.data.map((data: React.JSX.IntrinsicAttributes & ApiPayloadProps) => (
          <Stack
            flex={1}
            key={`stack-${data.method}`}
            width="100%"
            $gtSm={{ width: '48%' }}
            $gtLg={{ width: '30%' }}
          >
            <Playground key={`payload-${data.method}`} {...data} />
          </Stack>
        ))}
      </YStack>
    </CollapsibleSection>
  );
}

const ApiPayload = () => {
  const intl = useIntl();

  return (
    <Stack>
      <HandleSDKEvents />
      <DeviceProvider>
        <CommonParamsProvider>
          <CommonParamsView />
          <ExpandModeProvider>
            <PanelView title={intl.formatMessage({ id: 'title__hardware_api_test' })}>
              <FlatList
                data={playgroundConfig}
                keyExtractor={item => `playground-${item.title}`}
                renderItem={renderItem}
              />
            </PanelView>
          </ExpandModeProvider>
          <UploadScreen />
          <ChangeScreenComponent />
        </CommonParamsProvider>
      </DeviceProvider>
    </Stack>
  );
};

export default function ApiPayloadScreen() {
  return (
    <PageView>
      <ApiPayload />
    </PageView>
  );
}
