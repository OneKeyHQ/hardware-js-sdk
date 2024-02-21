import React, { useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { Stack, XStack, YStack, useMedia } from 'tamagui';

import PageView from '../components/ui/Page';
import HandleSDKEvents from '../components/HandleSDKEvents';
import { DeviceProvider } from '../provider/DeviceProvider';
import { CommonParamsProvider } from '../provider/CommonParamsProvider';
import CommonParamsView from '../components/CommonParamsView';
import { UploadScreen } from '../components/UploadScreen';
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
    title: 'Bitcoin API',
    data: require('../data/bitcoin').default,
  },
  {
    title: 'Ethereum API',
    data: require('../data/ethereum').default,
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
    title: 'Nexa API',
    data: require('../data/nexa').default,
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
    title: 'TRON API',
    data: require('../data/tron').default,
  },
  {
    title: 'Nostr API',
    data: require('../data/nostr').default,
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
            key={data.method}
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

const ApiPayload = () => (
  <Stack>
    <HandleSDKEvents />
    <DeviceProvider>
      <CommonParamsProvider>
        <CommonParamsView />
        <ExpandModeProvider>
          <PanelView title="Hardware Api Test">
            <FlatList
              data={playgroundConfig}
              keyExtractor={item => `playground-${item.title}`}
              renderItem={renderItem}
            />
          </PanelView>
        </ExpandModeProvider>
        <UploadScreen />
      </CommonParamsProvider>
    </DeviceProvider>
  </Stack>
);

export default function ApiPayloadScreen() {
  return (
    <PageView>
      <ApiPayload />
    </PageView>
  );
}
