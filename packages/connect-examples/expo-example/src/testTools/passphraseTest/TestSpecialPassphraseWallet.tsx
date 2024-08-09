import { useContext, useMemo, useRef, useState } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { Input, Label, Stack, Text, YStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import { useSetAtom } from 'jotai';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { TestCase, TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import { SwitchInput } from '../../components/SwitchInput';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';
import { CommonInput } from '../../components/CommonInput';
import PanelView from '../../components/ui/Panel';
import { baseParams } from '../addressTest/baseParams';
import { replaceTemplate } from '../addressTest/data/utils';
import { ItemVerifyState } from '../../components/BaseTestRunner/Context/TestRunnerVerifyProvider';
import mockDevice from '../../utils/mockDevice';
import TestRunnerOptionButtons from '../../components/BaseTestRunner/TestRunnerOptionButtons';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';

type TestCaseDataType = {
  id: string;
  method: string;
  passphrase: string;
  address?: string;
  path?: string;
  passphraseState?: string;
  emptyPassphraseState?: boolean;
};

type PassphraseTestCase = TestCase<TestCaseDataType[]>;

type ResultViewProps = {
  item: TestCaseDataWithKey<TestCaseDataType>;
  itemVerifyState: ItemVerifyState;
};

function ResultView({ item, itemVerifyState }: ResultViewProps) {
  const intl = useIntl();
  const title = `${item?.id} ${item?.method} ${item.path} passphrase:「${item.passphrase}」`;

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
    fileName: 'SpecialPassphraseTest',
    reportTitle: 'SpecialPassphraseTestReport',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Case`);
      markdown.push(
        `| State | WalletName | Method | Path | Passphrase | PassphraseState | Address |`
      );
      markdown.push(`| --- | --- | --- | --- | --- | --- | --- |`);
      items.forEach(item => {
        const caseItem = item;
        const { id, $key, method, path, address, passphrase, passphraseState } = caseItem;

        const state = itemVerifyState?.[$key].verify;

        const runnerResult = state === 'fail' ? itemVerifyState?.[$key].error : address;
        markdown.push(
          `| ${state} | ${id} | ${method} | ${path} | ${passphrase} | ${passphraseState} | ${runnerResult} |`
        );
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

function getRequestParams(method: string) {
  // @ts-expect-error
  const params = baseParams[method];
  let requestParams = {};

  if (params?.addressParameters?.path) {
    // ada case
    const path = replaceTemplate('0', params.addressParameters.path);
    const stakingPath = replaceTemplate('0', params.addressParameters.stakingPath);
    requestParams = {
      ...params,
      addressParameters: {
        ...params.addressParameters,
        path,
        stakingPath,
      },
    };
  } else {
    const path = replaceTemplate('0', params.path);
    requestParams = {
      ...params,
      path,
    };
  }

  return requestParams;
}

const testCase: PassphraseTestCase = {
  id: '1',
  name: 'Special Passphrase Wallet Test',
  description: 'Test special passphrase wallet',
  data: [
    {
      id: 'Wallet-1',
      method: 'btcGetAddress',
      passphrase: 'Aa0!)_+맪Ӎ¬}¨¥ϸΔѭЧゞく6鼵',
    },
    {
      id: 'Wallet-2',
      method: 'btcGetAddress',
      passphrase: '¥Øÿ', // 合法的扩展 ASCII 字符
    },
    {
      id: 'Wallet-3',
      method: 'btcGetAddress',
      passphrase: 'P@sswôrd€', // 包含 32 - 255 之外的 ASCII 字符
    },
    {
      id: 'Wallet-4',
      method: 'btcGetAddress',
      passphrase: ' My Passphrase ', // 包含空格
    },
    {
      id: 'Wallet-5',
      method: 'btcGetAddress',
      passphrase: '私のパスワード', // 包含日文字符
    },
    {
      id: 'Wallet-6',
      method: 'btcGetAddress',
      passphrase: 'myسياسةpassphrase', // 包含阿拉伯字符
    },
    {
      id: 'Wallet-7',
      method: 'btcGetAddress',
      passphrase: '你好passphrase', // 包含中文字符
    },
    {
      id: 'Wallet-8',
      method: 'btcGetAddress',
      // 西班牙
      passphrase: 'mi política de frase de contraseña', // 包含西班牙字符
    },
    {
      id: 'Wallet-9',
      method: 'btcGetAddress',
      passphrase: String.fromCharCode(...Array.from({ length: 25 }, (_, i) => i + 96)),
    },
  ],
};

let hardwareUiEventListener: any | undefined;
function ExecuteView() {
  const intl = useIntl();
  const [showOnOneKey, setShowOnOneKey] = useState<boolean>(false);
  const { openDialog } = useHardwareInputPinDialog();

  const [mnemonic, setMnemonic] = useState<string>('');

  const currentPassphrase = useRef<string | undefined>('');

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
      if (!mnemonic) {
        alert(intl.formatMessage({ id: 'message__message_is_empty' }));
        return Promise.reject();
      }

      if (!features?.passphrase_protection) {
        await sdk.deviceSettings(connectId, {
          usePassphrase: true,
        });
      }
    },
    initTestCase: async (context, sdk) => {
      const passphraseStateList = testCase.data;

      const cacheAddress = new Map<
        string,
        {
          passphraseState?: string;
        }
      >();

      for (const item of passphraseStateList) {
        currentPassphrase.current = item.passphrase ?? '';
        context.printLog(
          `${intl.formatMessage({ id: 'message__create' })} ${item.id}, passphrase: 「${
            item.passphrase
          }」`
        );
        const passphraseStateRes = await sdk.getPassphraseState(context.connectId, {
          initSession: true,
          useEmptyPassphrase: item.emptyPassphraseState,
        });

        if (!passphraseStateRes.success) {
          return Promise.resolve(undefined);
        }

        const passphraseState = passphraseStateRes.payload;

        cacheAddress.set(item.id, {
          passphraseState,
        });
      }

      const currentTestCases: TestCaseDataWithKey<TestCaseDataType>[] = [];
      for (const item of passphraseStateList) {
        ['btcGetAddress', 'evmGetAddress', 'dnxGetAddress'].forEach(method => {
          const params = getRequestParams(method);

          try {
            // @ts-expect-error
            const mockRes = mockDevice?.[method]?.('', '', {
              ...params,
              mnemonic: mnemonic.trim(),
              passphrase: item.passphrase,
            });

            const key = `${item.id}-${method}`;
            currentTestCases.push({
              ...item,
              ...cacheAddress.get(item.id),
              address: mockRes?.payload?.address,
              path:
                get(params, 'path', undefined) || get(params, 'addressParameters.path', undefined),
              method,
              $key: key,
            });
            context.printLog(
              `${intl.formatMessage({ id: 'message__generate' })} ${
                item.id
              } ${method} ${intl.formatMessage({ id: 'message__address' })} ${
                mockRes?.payload?.address
              }`
            );
          } catch (e) {
            console.log('=====>>>>> error', e);
          }
        });
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
    prepareRunnerTestCase: async (sdk, connectId, item) => {
      currentPassphrase.current = item.passphrase;
      return Promise.resolve();
    },
    generateRequestParams: item => {
      const requestParams = {
        ...getRequestParams(item.method),
        passphraseState: item.passphraseState,
        useEmptyPassphrase: !item.passphrase,
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
      <YStack>
        <YStack>
          <Text fontSize={14}>
            {intl.formatMessage({ id: 'message__passphrase_special_test_describe' })}
          </Text>
        </YStack>

        <Stack flexDirection="row" flexWrap="wrap" gap="$2">
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
      </YStack>
    ),
    [beginTest, intl, mnemonic, showOnOneKey, stopTest]
  );

  return contentMemo;
}

export function TestSpecialPassphraseWallet() {
  return (
    <PanelView>
      <TestRunnerView<PassphraseTestCase['data']>
        title="Special Passphrase Test"
        renderExecuteView={() => <ExecuteView />}
        renderResultView={(item, itemVerifyState) => (
          <ResultView item={item} itemVerifyState={itemVerifyState} />
        )}
      />
    </PanelView>
  );
}
