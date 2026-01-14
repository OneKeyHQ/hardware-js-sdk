import React from 'react';
import { Separator, Stack, Text, YStack } from 'tamagui';
import { useIntl } from 'react-intl';

import { DeviceProvider } from '../provider/DeviceProvider';
import { TestSingleAddress } from '../testTools/addressTest/TestSingleAddress';
import { TestBatchAddress } from '../testTools/addressTest/TestBatchAddress';
import { TestSinglePubkey } from '../testTools/pubkeyTest/TestSinglePubkey';
import { TestBatchPubkey } from '../testTools/pubkeyTest/TestBatchPubkey';
import {
  testCases as addressTestCases,
  batchTestCases as batchAddressTestCases,
} from '../testTools/addressTest/data';
import {
  batchTestCases as batchPubkeyTestCases,
  batchSoftTestCases as batchSoftPubkeyTestCases,
  testCases as pubkeyTestCases,
} from '../testTools/pubkeyTest/data';
import {
  testCases as addressVariantTestCases,
  batchTestCases as batchVariantAddressTestCases,
} from '../testTools/addressTest/dataVariant';
import PageView from '../components/ui/Page';
import PanelView from '../components/ui/Panel';
import { MnemonicAddressValidation } from '../testTools/addressTest/MnemonicAddressValidation';
import { HardwareInputPinDialogProvider } from '../provider/HardwareInputPinProvider';

export default function AddressTestScreen() {
  const intl = useIntl();
  return (
    <PageView>
      <DeviceProvider>
        <HardwareInputPinDialogProvider>
          <Stack>
            <PanelView>
              <MnemonicAddressValidation />
            </PanelView>

            {/* 🔔 重要提示：安全检查设置 */}
            <YStack
              padding="$4"
              marginVertical="$3"
              backgroundColor="$yellow2"
              borderRadius="$4"
              borderWidth={2}
              borderColor="$yellow8"
            >
              <Text fontSize={16} fontWeight="bold" color="$yellow11" marginBottom="$2">
                ⚠️ 提示
              </Text>
              <Text fontSize={14} color="$yellow11" lineHeight={20}>
                对于 【Classic/Classic1s/ClassicPure】
                设备进行地址测试时，需要在设备上关闭安全检查功能：
              </Text>
              <Text fontSize={14} color="$yellow11" marginTop="$2" lineHeight={20}>
                设备操作：关于设备 → 「安全检查」
              </Text>
            </YStack>

            <PanelView>
              <TestSingleAddress
                title={intl.formatMessage({ id: 'title__address_test_single' })}
                testCases={addressTestCases}
              />
            </PanelView>
            <PanelView>
              <TestBatchAddress
                title={intl.formatMessage({ id: 'title__address_test_batch' })}
                testCases={batchAddressTestCases}
              />
            </PanelView>
            <PanelView>
              <TestSinglePubkey
                title={intl.formatMessage({ id: 'title__publickey_test_single' })}
                testCases={pubkeyTestCases}
              />
            </PanelView>
            <PanelView>
              <TestBatchPubkey
                title={intl.formatMessage({ id: 'title__publickey_test_batch' })}
                testCases={batchPubkeyTestCases}
              />
            </PanelView>
            <PanelView>
              <TestBatchPubkey
                title={intl.formatMessage({ id: 'title__publickey_test_batch_soft' })}
                testCases={batchSoftPubkeyTestCases}
              />
            </PanelView>

            <Stack marginTop="$8" />

            <PanelView>
              <TestSingleAddress
                title={intl.formatMessage({ id: 'title__address_variant_test_single' })}
                testCases={addressVariantTestCases}
              />
            </PanelView>
            <PanelView>
              <TestBatchAddress
                title={intl.formatMessage({ id: 'title__address_variant_test_batch' })}
                testCases={batchVariantAddressTestCases}
              />
            </PanelView>
          </Stack>
        </HardwareInputPinDialogProvider>
      </DeviceProvider>
    </PageView>
  );
}
