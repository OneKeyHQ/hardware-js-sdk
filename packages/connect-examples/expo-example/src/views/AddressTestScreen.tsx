import React from 'react';
import { Separator, Stack } from 'tamagui';
import { DeviceProvider } from '../provider/DeviceProvider';
import { TestSingleAddress } from '../testTools/addressTest/TestSingleAddress';
import { TestBatchAddress } from '../testTools/addressTest/TestBatchAddress';
import { TestSinglePubkey } from '../testTools/pubkeyTest/TestSinglePubkey';
import { TestBatchPubkey } from '../testTools/pubkeyTest/TestBatchPubkey';
import {
  batchTestCases as batchAddressTestCases,
  testCases as addressTestCases,
} from '../testTools/addressTest/data';
import {
  batchTestCases as batchPubkeyTestCases,
  testCases as pubkeyTestCases,
} from '../testTools/pubkeyTest/data';
import {
  batchTestCases as batchVariantAddressTestCases,
  testCases as addressVariantTestCases,
} from '../testTools/addressTest/dataVariant';
import {
  batchTestCases as batchVariantPubkeyTestCases,
  testCases as pubkeyVariantTestCases,
} from '../testTools/pubkeyTest/dataVariant';
import PageView from '../components/ui/Page';
import PanelView from '../components/ui/Panel';

export default function AddressTestScreen() {
  return (
    <PageView>
      <DeviceProvider>
        <Stack>
          <PanelView>
            <TestSingleAddress title="Single Address Test" testCases={addressTestCases} />
          </PanelView>
          <PanelView>
            <TestBatchAddress title="Batch Address Test" testCases={batchAddressTestCases} />
          </PanelView>
          <PanelView>
            <TestSinglePubkey title="Single Pubkey Test" testCases={pubkeyTestCases} />
          </PanelView>
          <PanelView>
            <TestBatchPubkey title="Batch Pubkey Test" testCases={batchPubkeyTestCases} />
          </PanelView>

          <Stack marginTop="$8" />

          <PanelView>
            <TestSingleAddress
              title="Single Variant Address Test"
              testCases={addressVariantTestCases}
            />
          </PanelView>
          <PanelView>
            <TestBatchAddress
              title="Batch Variant Address Test"
              testCases={batchVariantAddressTestCases}
            />
          </PanelView>
        </Stack>
      </DeviceProvider>
    </PageView>
  );
}
