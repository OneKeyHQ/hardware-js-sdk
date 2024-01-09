/* eslint-disable global-require, @typescript-eslint/no-var-requires */
import React from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import HandleSDKEvents from './HandleSDKEvents';
import Playground, { PlaygroundProps } from './Playground';
import { DeviceProvider } from '../provider/DeviceProvider';
import { CommonParamsProvider } from '../provider/CommonParamsProvider';
import CommonParamsView from './CommonParamsView';
import { CollapsibleSection } from './CollapsibleSection';
import { ExpandModeProvider } from '../provider/ExpandModeProvider';
import { UploadScreen } from './UploadScreen';
import UpdateFirmware from './UpdateFirmware';

const playgroundConfig = [
  {
    title: 'Lightning Network API',
    data: require('../data/lightning').default,
  },
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

const PlaygroundManager = () => (
  <View style={styles.container}>
    <HandleSDKEvents />
    <DeviceProvider>
      <CommonParamsProvider>
        <CommonParamsView />
        <UpdateFirmware />
        <UploadScreen />
        <ExpandModeProvider>
          <FlatList
            contentContainerStyle={styles.flatListContainer}
            data={playgroundConfig}
            keyExtractor={item => `playground-${item.title}`}
            renderItem={({ item }) => (
              <CollapsibleSection title={item.title}>
                {item.data.map((data: React.JSX.IntrinsicAttributes & PlaygroundProps) => (
                  <Playground key={data.method} {...data} />
                ))}
              </CollapsibleSection>
            )}
          />
        </ExpandModeProvider>
      </CommonParamsProvider>
    </DeviceProvider>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  flatListContainer: {
    marginTop: 12,
    marginBottom: 24,
  },
  header: {
    fontWeight: 'bold',
    fontSize: 24,
    paddingVertical: 10,
  },
});

export default PlaygroundManager;
