import { useMemo, useRef, useState } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { Input, Label, Stack, Text, YStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { get, isEmpty } from 'lodash';
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
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';
import { CommonInput } from '../../components/CommonInput';

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
      id: 'alephiumGetAddress',
      method: 'alephiumGetAddress',
    },
    {
      id: 'dnxGetAddress',
      method: 'dnxGetAddress',
    },
    {
      id: 'tonGetAddress',
      method: 'tonGetAddress',
    },
    {
      id: 'scdoGetAddress',
      method: 'scdoGetAddress',
    },
    {
      id: 'suiGetAddress',
      method: 'suiGetAddress',
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
  const { openDialog } = useHardwareInputPinDialog();

  const [mnemonic, setMnemonic] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const currentPassphrase = useRef<string | undefined>('');
  const currentPassphraseState = useRef<string | undefined>('');

  const { stopTest, beginTest } = useRunnerTest<TestCaseDataType>({
    initHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      hardwareUiEventListener = (message: CoreMessage) => {
        console.log('TopLEVEL EVENT ===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          openDialog(sdk, message.payload.device.features);
        }
        if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
          setTimeout(() => {
            sdk.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: {
                value: currentPassphrase.current ?? '',
              },
            });
          }, 200);
        }
      };
      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    prepareRunner: async (connectId, deviceId, features, sdk) => {
      currentPassphraseState.current = undefined;

      if (!mnemonic) {
        alert(intl.formatMessage({ id: 'message__message_is_empty' }));
        return Promise.reject();
      }

      if (isEmpty(currentPassphrase.current)) {
        if (features?.passphrase_protection) {
          await sdk.deviceSettings(connectId, {
            usePassphrase: false,
          });
        }
      } else {
        if (!features?.passphrase_protection) {
          await sdk.deviceSettings(connectId, {
            usePassphrase: true,
          });
        }
        const passphraseStateRes = await sdk.getPassphraseState(connectId, {
          initSession: true,
          useEmptyPassphrase: false,
        });

        if (!passphraseStateRes.success) {
          alert('获取 passphraseState 失败');
          return Promise.reject();
        }

        currentPassphraseState.current = passphraseStateRes.payload;
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
            const mockRes = await mockDevice?.[method]?.('', '', {
              ...params,
              mnemonic: mnemonic.trim(),
              passphrase: currentPassphrase.current,
            });

            const key = `${item.id}-${method}-${variant}`;
            const address = mockRes?.payload?.address || mockRes?.payload?.trackingKey;
            const caseObject = {
              ...item,
              address,
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
              })} ${address}`
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
        passphraseState: currentPassphraseState.current,
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

      const responseAddress =
        // @ts-expect-error
        response.address?.toLowerCase() || response.trackingKey?.toLowerCase();
      if (item.address?.toLowerCase() !== responseAddress) {
        return Promise.resolve({
          error: `actual: ${responseAddress}, expected: ${item.address}`,
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

  const passphraseInputMemo = useMemo(
    () => (
      <CommonInput
        type="text"
        label="Passphrase"
        value={passphrase}
        onChange={v => {
          setPassphrase(v);
          currentPassphrase.current = v;
        }}
      />
    ),
    [passphrase]
  );

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
        {passphraseInputMemo}
        <SwitchInput
          label={intl.formatMessage({ id: 'label__show_on_onekey' })}
          value={showOnOneKey}
          onToggle={setShowOnOneKey}
        />
        <TestRunnerOptionButtons onStop={stopTest} onStart={beginTest} />
        <ExportReportView />
      </Stack>
    ),
    [beginTest, intl, mnemonic, passphraseInputMemo, showOnOneKey, stopTest]
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
