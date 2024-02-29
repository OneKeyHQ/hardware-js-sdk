import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';

import { Stack, Text } from 'tamagui';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { TestCase, TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import { SwitchInput } from '../../components/SwitchInput';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';
import { CommonInput } from '../../components/CommonInput';
import { TestChain } from './utils';
import PanelView from '../../components/ui/Panel';
import { baseParams } from '../addressTest/baseParams';
import { replaceTemplate } from '../addressTest/data/utils';
import TestRunnerOptionButtons from '../../components/BaseTestRunner/TestRunnerOptionButtons';

type TestCaseDataType = {
  id: string;
  method: string;
  passphrase: string;
  path?: string;
  address?: string;
  passphraseState?: string;
  emptyPassphraseState?: boolean;
};

type PassphraseTestCase = TestCase<
  TestCaseDataType[],
  {
    type: TestChain | 'multi';
  }
>;

type ResultViewProps = { item: TestCaseDataWithKey<TestCaseDataType> };

const testCases: PassphraseTestCase[] = [
  {
    id: 'btc Test',
    name: 'BTC(Secp256k1) Wallet',
    description: 'Test switch BTC wallet with different passphrase state',
    extra: {
      type: 'btc',
    },
    data: [],
  },
  {
    id: 'evm Test',
    name: 'EVM(Secp256k1) Wallet',
    description: 'Test switch EVM wallet with different passphrase state',
    extra: {
      type: 'evm',
    },
    data: [],
  },
  {
    id: 'dot Test',
    name: 'Dot(ED25519) Wallet',
    description: 'Test switch Dot wallet with different passphrase state',
    extra: {
      type: 'dot',
    },
    data: [],
  },
  {
    id: 'ada Test',
    name: 'Ada Wallet',
    description: 'Test switch Ada wallet with different passphrase state',
    extra: {
      type: 'ada',
    },
    data: [],
  },
  {
    id: 'multi Test',
    name: 'MultiChain Wallet',
    description: 'Test switch Multi wallet with different passphrase state',
    extra: {
      type: 'multi',
    },
    data: [],
  },
];

function ResultView({ item }: ResultViewProps) {
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
    fileName: 'SwitchPassphraseWallet',
    reportTitle: 'SwitchPassphraseWalletTestReport',
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

let hardwareUiEventListener: any | undefined;
function ExecuteView() {
  const intl = useIntl();
  const [showOnOneKey, setShowOnOneKey] = useState<boolean>(false);
  const [testCaseList, setTestCaseList] = useState<string[]>([]);
  const [currentTestCase, setCurrentTestCase] = useState<PassphraseTestCase>();
  const [testDescription, setTestDescription] = useState<string>();

  const [includeNormal, setIncludeNormal] = useState<boolean>(true);
  const [sequential, setSequential] = useState<boolean>(true);
  const [testWalletCount, setTestWalletCount] = useState(5);
  const [changeWalletCount, setChangeWalletCount] = useState(20);

  const findTestCase = useCallback((name: string) => {
    const testCase = testCases.find(testCase => testCase.name === name);
    return testCase;
  }, []);

  useEffect(() => {
    const testCaseList: string[] = [];
    testCases.forEach(testCase => {
      testCaseList.push(testCase.name);
    });
    setTestCaseList(testCaseList);
    setCurrentTestCase(findTestCase(testCaseList[0]));
  }, [findTestCase]);

  useEffect(() => {
    const testCase = currentTestCase;
    if (!testCase) return;

    setTestDescription(testCase.description);
  }, [currentTestCase]);

  const currentPassphrase = useRef<string | undefined>('');

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
      if (!features?.passphrase_protection) {
        await sdk.deviceSettings(connectId, {
          usePassphrase: true,
        });
      }
    },
    initTestCase: async (sdk, connectId, deviceId) => {
      const passphraseStateList: TestCaseDataType[] = [];

      Array.from({ length: testWalletCount }).forEach((_, index) => {
        let currentCoin = currentTestCase?.extra?.type;
        if (currentCoin === 'multi') {
          currentCoin = ['btc', 'evm', 'dot', 'ada'][index % 4] as TestChain;
        }

        let method;
        switch (currentCoin) {
          case 'btc':
            method = 'btcGetAddress';
            break;
          case 'evm':
            method = 'evmGetAddress';
            break;
          case 'dot':
            method = 'polkadotGetAddress';
            break;
          case 'ada':
            method = 'cardanoGetAddress';
            break;
          default:
            return;
        }

        if (index === 0 && includeNormal) {
          passphraseStateList?.push({
            id: `Wallet-${index}`,
            passphrase: '',
            emptyPassphraseState: true,
            method,
          });
        } else {
          passphraseStateList?.push({
            id: `Wallet-${index}`,
            passphrase: `${index}`,
            method,
          });
        }
      });

      const cacheAddress = new Map<
        string,
        {
          path: string;
          address: string;
          passphraseState?: string;
        }
      >();
      for (const item of passphraseStateList) {
        currentPassphrase.current = item.passphrase;
        const passphraseStateRes = await sdk.getPassphraseState(connectId, {
          initSession: true,
          useEmptyPassphrase: item.emptyPassphraseState,
        });

        if (!passphraseStateRes.success) {
          return Promise.resolve(undefined);
        }

        const passphraseState = passphraseStateRes.payload;

        const params = {
          ...getRequestParams(item.method),
          passphraseState,
          useEmptyPassphrase: !item.passphrase,
        };

        // @ts-expect-error
        const addressRes = await sdk[item.method as keyof typeof sdk](connectId, deviceId, params);
        if (!addressRes.success) {
          return Promise.resolve(undefined);
        }

        const { address } = addressRes.payload;
        cacheAddress.set(item.id, {
          path:
            (get(params, 'path', undefined) || get(params, 'addressParameters.path', undefined)) ??
            '',
          address,
          passphraseState,
        });
      }

      const currentTestCases = Array.from({ length: changeWalletCount }).map((_, index) => {
        let item;
        if (sequential) {
          // sequential
          item = passphraseStateList[index % testWalletCount];
        } else {
          // random
          item = passphraseStateList[Math.floor(Math.random() * 1000) % testWalletCount];
        }

        const key = `${item.method}-${index}`;
        return {
          ...item,
          ...cacheAddress.get(item.id),
          $key: key,
        } as unknown as TestCaseDataWithKey<TestCaseDataType>;
      });

      if (currentTestCases.length > 0) {
        return Promise.resolve({
          title: currentTestCase?.name ?? '',
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

      let error = '';

      if (response.address !== item.address) {
        error = `actual: ${response.address}, expected: ${item.address}`;
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
      <>
        <Text fontSize={13} paddingVertical="$2">
          {testDescription}
        </Text>
        <Stack flexDirection="row" flexWrap="wrap" gap="$2">
          <CommonInput
            type="number"
            label={intl.formatMessage({ id: 'label__wallet_count' })}
            value={testWalletCount.toString()}
            onChange={number => setTestWalletCount(parseInt(number))}
          />
          <CommonInput
            type="number"
            label={intl.formatMessage({ id: 'label__wallet_change_count' })}
            value={changeWalletCount.toString()}
            onChange={number => setChangeWalletCount(parseInt(number))}
          />
          <SwitchInput
            label={intl.formatMessage({ id: 'label__wallet_include_normal' })}
            value={!!includeNormal}
            onToggle={setIncludeNormal}
          />
          <SwitchInput
            label={intl.formatMessage({ id: 'label__wallet_sequential_switch' })}
            value={sequential}
            onToggle={setSequential}
          />
          <SwitchInput
            label={intl.formatMessage({ id: 'label__show_on_onekey' })}
            value={showOnOneKey}
            onToggle={setShowOnOneKey}
          />
          <Picker
            style={{ width: 200 }}
            selectedValue={currentTestCase?.name}
            onValueChange={itemValue => setCurrentTestCase(findTestCase(itemValue))}
          >
            {testCaseList.map((testCase, index) => (
              <Picker.Item key={`${index}`} label={testCase} value={testCase} />
            ))}
          </Picker>
          <TestRunnerOptionButtons onStop={stopTest} onStart={beginTest} />
          <ExportReportView />
        </Stack>
      </>
    ),
    [
      beginTest,
      changeWalletCount,
      currentTestCase?.name,
      findTestCase,
      includeNormal,
      intl,
      sequential,
      showOnOneKey,
      stopTest,
      testCaseList,
      testDescription,
      testWalletCount,
    ]
  );

  return contentMemo;
}

export function TestSwitchPassphraseWallet() {
  return (
    <PanelView>
      <TestRunnerView<PassphraseTestCase['data']>
        title="Passphrase Switch Wallet Test"
        renderExecuteView={() => <ExecuteView />}
        renderResultView={item => <ResultView item={item} />}
      />
    </PanelView>
  );
}
