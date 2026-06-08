import React, { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Platform } from 'react-native';
import { Stack, Text, XStack, YStack } from 'tamagui';

import PageView from '../components/ui/Page';
import HandleSDKEvents from '../components/HandleSDKEvents';
import { DeviceProvider } from '../provider/DeviceProvider';
import { CommonParamsProvider } from '../provider/CommonParamsProvider';
import CommonParamsView from '../components/CommonParamsView';
import { UploadScreen } from '../components/UploadScreen';
import ChangeScreenComponent from '../components/ChangeScreen';
import { ExpandModeProvider } from '../provider/ExpandModeProvider';
import { CollapsibleSection } from '../components/CollapsibleSection';
import Playground from '../components/Playground';
import PanelView from '../components/ui/Panel';
import { useMedia } from '../provider/MediaProvider';
import { Button } from '../components/ui/Button';

import type { PlaygroundProps as ApiPayloadProps } from '../components/Playground';

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
    title: 'Benfen API',
    data: require('../data/benfen').default,
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
    title: 'Neo API',
    data: require('../data/neo').default,
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
  {
    title: 'WipeDevice API',
    data: require('../data/wipeDevice').default,
  },
];

const pro2PlaygroundConfig = [
  {
    title: 'Pro2 Protocol V2 API',
    data: require('../data/pro2').default,
  },
];

type PayloadTab = 'all' | 'pro2';

interface ApiPayloadItem {
  title: string;
  data: Array<React.JSX.IntrinsicAttributes & ApiPayloadProps>;
}

interface ApiPayloadItemProps {
  item: ApiPayloadItem;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
const ApiPayloadItem = memo(({ item }: ApiPayloadItemProps) => {
  const media = useMedia();
  const flexDirection = media.gtSm ? 'row' : 'column';

  const renderedItems = useMemo(
    () =>
      item.data.map((data: React.JSX.IntrinsicAttributes & ApiPayloadProps) => (
        <PayloadStack key={`${data.method}-${data.description}`} data={data} />
      )),
    [item.data]
  );

  return (
    <CollapsibleSection title={item.title}>
      <YStack flexDirection={flexDirection} flexWrap="wrap" gap="$1" padding="$2">
        {renderedItems}
      </YStack>
    </CollapsibleSection>
  );
});
ApiPayloadItem.displayName = 'ApiPayloadItem';

const PayloadStack = memo(({ data }: { data: React.JSX.IntrinsicAttributes & ApiPayloadProps }) => {
  const media = useMedia();
  // eslint-disable-next-line no-nested-ternary
  const width = media.gtLg ? '30%' : media.gtSm ? '48%' : '100%';

  return (
    <Stack width={width}>
      <Playground {...data} />
    </Stack>
  );
});
PayloadStack.displayName = 'PayloadStack';

const ApiPayload = () => {
  const [activeTab, setActiveTab] = useState<PayloadTab>('all');
  const payloadConfig = activeTab === 'pro2' ? pro2PlaygroundConfig : playgroundConfig;

  const renderPayloadTabs = useCallback(
    () => (
      <XStack gap="$2" alignItems="center">
        {(
          [
            { key: 'all', label: 'All API' },
            { key: 'pro2', label: 'Pro2' },
          ] as Array<{ key: PayloadTab; label: string }>
        ).map(tab => (
          <Button
            key={tab.key}
            size="small"
            variant={activeTab === tab.key ? 'primary' : 'tertiary'}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text color={activeTab === tab.key ? '$textInverse' : '$textSubdued'}>{tab.label}</Text>
          </Button>
        ))}
      </XStack>
    ),
    [activeTab]
  );

  return (
    <Stack>
      <HandleSDKEvents />
      <CommonParamsProvider>
        <DeviceProvider>
          <CommonParamsView />
          <ExpandModeProvider>
            <PanelView title="API Payload" renderRight={renderPayloadTabs}>
              <FlatList
                data={payloadConfig}
                renderItem={({ item }) => <ApiPayloadItem item={item} />}
                keyExtractor={item => item.title}
                initialNumToRender={5}
                maxToRenderPerBatch={3}
              />
            </PanelView>
          </ExpandModeProvider>
          <UploadScreen />
          <ChangeScreenComponent />
        </DeviceProvider>
      </CommonParamsProvider>
    </Stack>
  );
};

export default function ApiPayloadScreen() {
  return (
    <PageView scrollable={!!(Platform.OS === 'ios' || Platform.OS === 'android')}>
      <ApiPayload />
    </PageView>
  );
}
