/**
 * SLIP39 批量测试统一组件
 * 支持地址和公钥的批量测试，使用Bundle模式提高效率
 */

import React from 'react';
import { View, Text, YStack } from 'tamagui';

import { SLIP39BatchAddressTest } from './SLIP39BatchAddressTest';
import { convertToBundleFormat } from './utils';
import { allPubkeyTestCases } from './pubKeyData';
import { slip39StateInstances } from './slip39StateManager';

// Convert SLIP39TestCaseData to SLIP39BatchTestCase using bundle format for pubkey
const convertedBundlePubkeyTests = allPubkeyTestCases.map(testCase =>
  convertToBundleFormat(testCase, 'pubkey')
);

export function SLIP39BatchTest() {
  return (
    <View flex={1} padding="$3">
      <YStack gap="$4">
        {/* 批量地址测试 */}
        <View backgroundColor="$gray1" borderRadius="$3" padding="$3">
          <SLIP39BatchAddressTest />
        </View>

        {/* 批量公钥测试 */}
        <View backgroundColor="$gray1" borderRadius="$3" padding="$3">
          <SLIP39BatchAddressTest
            testCases={convertedBundlePubkeyTests}
            stateManager={slip39StateInstances.batchPubkey}
          />
        </View>
      </YStack>
    </View>
  );
}

export default SLIP39BatchTest;
