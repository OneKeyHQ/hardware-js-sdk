import React from 'react';
import { Separator, Stack } from 'tamagui';
import { useIntl } from 'react-intl';
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
