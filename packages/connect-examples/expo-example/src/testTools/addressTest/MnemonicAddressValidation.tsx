import { useMemo, useState } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { Input, Label, Stack, Text, YStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { TestCase, TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import { SwitchInput } from '../../components/SwitchInput';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';
import { baseParams } from './baseParams';
import { replaceTemplate } from './data/utils';
import { ItemVerifyState } from '../../components/BaseTestRunner/Context/TestRunnerVerifyProvider';
import mockDevice from '../../utils/mockDevice';
import TestRunnerOptionButtons from '../../components/BaseTestRunner/TestRunnerOptionButtons';

type TestCaseDataType = {
  id: string;
  method: string;
  address?: string;
  path?: string;
  variant?: string;
};

type MnemonicAddressTestCase = TestCase<TestCaseDataType[]>;

const variantCase = ['0', '1', '25', '2147483646', '2147483647'];

const testCase: MnemonicAddressTestCase = {
  id: '1',
  name: 'Mnemonic Address Test',
  description: 'Test Mnemonic Address',
  data: [
    {
      id: 'btcGetAddress',
      method: 'btcGetAddress',
    },
    {
      id: 'evmGetAddress',
      method: 'evmGetAddress',
    },
    {
      id: 'suiGetAddress',
      method: 'suiGetAddress',
    },
    {
      id: 'dnxGetAddress',
      method: 'dnxGetAddress',
    },
  ],
};

type ResultViewProps = {
  item: TestCaseDataWithKey<TestCaseDataType>;
  itemVerifyState: ItemVerifyState;
};

function ResultView({ item, itemVerifyState }: ResultViewProps) {
  const intl = useIntl();
  const title = `${item?.method} ${item.path}`;

  return (
    <>
      <Stack flexDirection="row">
        <Text fontSize={14}>{title}</Text>
      </Stack>

      <Text fontSize={14}>
        {intl.formatMessage({ id: 'label__expected' })} {item?.address}
      </Text>
    </>
  );
}

function ExportReportView() {
  const intl = useIntl();
  const { showExportReport, exportReport } = useExportReport<TestCaseDataType>({
    fileName: 'MnemonicAddressTest',
    reportTitle: 'MnemonicAddressTestReport',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(`| State | Method | Path | Address |`);
      markdown.push(`| --- | --- | --- | --- |`);
      items.forEach(item => {
        const caseItem = item;
        const { $key, method, path, address } = caseItem;

        const state = itemVerifyState?.[$key].verify;

        const runnerResult = state === 'fail' ? itemVerifyState?.[$key].error : address;
        markdown.push(`| ${state} | ${method} | ${path} | ${runnerResult} |`);
      });

      return Promise.resolve(markdown);
    },
  });

  if (showExportReport) {
    return (
      <Button variant="primary" onPress={exportReport}>
        {intl.formatMessage({ id: 'action__export_report' })}
      </Button>
    );
  }

  return null;
}

function getRequestParams(method: string, index: string) {
  // @ts-expect-error
  const params = baseParams[method];
  let requestParams = {};

  if (params?.addressParameters?.path) {
    // ada case
    const path = replaceTemplate(index, params.addressParameters.path);
    const stakingPath = replaceTemplate(index, params.addressParameters.stakingPath);
    requestParams = {
      ...params,
      addressParameters: {
        ...params.addressParameters,
        path,
        stakingPath,
      },
    };
  } else {
    const path = replaceTemplate(index, params.path);
    requestParams = {
      ...params,
      path,
    };
  }

  return requestParams;
}

let hardwareUiEventListener: any | undefined;
function ExecuteView() {
  const intl = useIntl();
  const [showOnOneKey, setShowOnOneKey] = useState<boolean>(false);

  const [mnemonic, setMnemonic] = useState<string>('');

  const { stopTest, beginTest } = useRunnerTest<TestCaseDataType>({
    initHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      hardwareUiEventListener = (message: CoreMessage) => {
        console.log('TopLEVEL EVENT ===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          sdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PIN,
            payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
          });
        }
      };
      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    prepareRunner: async (connectId, deviceId, features, sdk) => {
      if (!mnemonic) {
        alert(intl.formatMessage({ id: 'message__message_is_empty' }));
        return Promise.reject();
      }

      if (features?.passphrase_protection) {
        await sdk.deviceSettings(connectId, {
          usePassphrase: false,
        });
      }
    },
    initTestCase: async (context, sdk) => {
      const passphraseStateList = testCase.data;

      const currentTestCases: TestCaseDataWithKey<TestCaseDataType>[] = [];
      for (const item of passphraseStateList) {
        const { method } = item;

        for (const variant of variantCase) {
          const params = getRequestParams(method, variant);
          console.log('======>>>>> passphraseStateList', params);
          try {
            // @ts-expect-error
            const mockRes = mockDevice?.[method]?.('', '', {
              ...params,
              mnemonic: mnemonic.trim(),
            });

            const key = `${item.id}-${method}-${variant}`;
            const caseObject = {
              ...item,
              address: mockRes?.payload?.address,
              path:
                get(params, 'path', undefined) || get(params, 'addressParameters.path', undefined),
              method,
              variant,
              $key: key,
            };
            currentTestCases.push(caseObject);
            context.printLog(
              `${intl.formatMessage({ id: 'message__fetch' })} ${
                caseObject.path
              } ${method}  ${intl.formatMessage({
                id: 'message__address',
              })} ${mockRes?.payload?.address}`
            );
          } catch (e) {
            console.log('=====>>>>> error', e);
          }
        }
      }

      console.log('currentTestCases', currentTestCases);

      if (currentTestCases.length > 0) {
        return Promise.resolve({
          title: testCase?.name ?? '',
          data: currentTestCases,
        });
      }

      return Promise.resolve(undefined);
    },
    generateRequestParams: item => {
      const requestParams = {
        ...getRequestParams(item.method, item.variant ?? '0'),
        // passphraseState: item.passphraseState,
        // useEmptyPassphrase: !item.passphrase,
        showOnOneKey,
      };

      return Promise.resolve({
        method: item.method,
        params: requestParams,
      });
    },
    processResponse: (res, item, itemIndex) => {
      const response = res as {
        path: string;
        address: string;
      };

      const error = '';

      if (item.address?.toLowerCase() !== response.address?.toLowerCase()) {
        return Promise.resolve({
          error: `actual: ${response.address}, expected: ${item.address}`,
        });
      }

      return Promise.resolve({
        error,
      });
    },
    removeHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      return Promise.resolve();
    },
  });

  const contentMemo = useMemo(
    () => (
      <Stack flexDirection="row" flexWrap="wrap" gap="$2">
        <YStack>
          <Text fontSize={14}>
            {intl.formatMessage({ id: 'message__test_device_create_wallet_describe' })}
          </Text>
        </YStack>

        <Stack width="100%">
          <Label paddingRight="$0" justifyContent="center">
            {intl.formatMessage({ id: 'label__wallet_mnemonic' })}
          </Label>
          <Input
            multiline
            size="$4"
            keyboardType="numeric"
            value={mnemonic.toString()}
            onChangeText={str => setMnemonic(str)}
          />
        </Stack>
        <SwitchInput
          label={intl.formatMessage({ id: 'label__show_on_onekey' })}
          value={showOnOneKey}
          onToggle={setShowOnOneKey}
        />
        <TestRunnerOptionButtons onStop={stopTest} onStart={beginTest} />
        <ExportReportView />
      </Stack>
    ),
    [beginTest, intl, mnemonic, showOnOneKey, stopTest]
  );

  return contentMemo;
}

export function MnemonicAddressValidation() {
  return (
    <TestRunnerView<MnemonicAddressTestCase['data']>
      title="Mnemonic Address Test"
      renderExecuteView={() => <ExecuteView />}
      renderResultView={(item, itemVerifyState) => (
        <ResultView item={item} itemVerifyState={itemVerifyState} />
      )}
    />
  );
}
