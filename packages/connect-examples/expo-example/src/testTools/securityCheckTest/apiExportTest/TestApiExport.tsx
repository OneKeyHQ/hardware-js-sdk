import { useRef, useState, useEffect, useContext } from 'react';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE, getDeviceType } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';
import { useIntl } from 'react-intl';
import { Stack, Text, View } from 'tamagui';
import { TestRunnerView } from '../../../components/BaseTestRunner/TestRunnerView';
import { useRunnerTest } from '../../../components/BaseTestRunner/useRunnerTest';
import { ApiExportTestCase } from './types';
import { TestCaseDataWithKey, VerifyState } from '../../../components/BaseTestRunner/types';
import { PlaygroundProps, TestDeviceExpect, TestDeviceType } from '../../../components/Playground';

import deviceApi from '../../../data/device';
import wipeDevice from '../../../data/wipeDevice';
import managerApi from '../../../data/manager';
import algoApi from '../../../data/algo';
import aptosApi from '../../../data/aptos';
import basicApi from '../../../data/basic';
import bitcoinApi from '../../../data/bitcoin';
import cardanoApi from '../../../data/cardano';
import confluxApi from '../../../data/conflux';
import cosmosApi from '../../../data/cosmos';
import cryptoApi from '../../../data/crypto';
import dynexApi from '../../../data/dynex';
import debugApi from '../../../data/debug';
import emmcApi from '../../../data/emmc';
import ethereumApi from '../../../data/ethereum';
import ethereumTrezorApi from '../../../data/ethereumTrezor';
import filecoinApi from '../../../data/filecoin';
import kaspaApi from '../../../data/kaspa';
import lightningApi from '../../../data/lightning';
import nearApi from '../../../data/near';
import nemApi from '../../../data/nem';
import nexaApi from '../../../data/nexa';
import nostrApi from '../../../data/nostr';
import otherApi from '../../../data/other';
import polkadotApi from '../../../data/polkadot';
import rippleApi from '../../../data/ripple';
import solanaApi from '../../../data/solana';
import starcoinApi from '../../../data/starcoin';
import stellarApi from '../../../data/stellar';
import suiApi from '../../../data/sui';
import tronApi from '../../../data/tron';
import { Button } from '../../../components/ui/Button';
import useExportReport from '../../../components/BaseTestRunner/useExportReport';
import TestRunnerOptionButtons from '../../../components/BaseTestRunner/TestRunnerOptionButtons';
import { CommonInput } from '../../../components/CommonInput';
import { TestRunnerContext } from '../../../components/BaseTestRunner/Context/TestRunnerProvider';

type TestCaseDataType = ApiExportTestCase['data'][0];
type ResultViewProps = { item: TestCaseDataWithKey<TestCaseDataType> };

type TestClass = 'normal' | 'bootloader';

function TestRunnerErrorButtons({
  onStart: start,
  onExistsErrorCase,
}: {
  onStart: () => void;
  onExistsErrorCase: () => boolean;
}) {
  const { runnerDone } = useContext(TestRunnerContext);
  const intl = useIntl();

  return runnerDone !== false && onExistsErrorCase?.() ? (
    <Button variant="primary" onPress={start}>
      {intl.formatMessage({ id: 'action__start_error_test' })}
    </Button>
  ) : null;
}

function ExportReportView({
  testModel = 'normal',
  testScope = 'all',
}: {
  testModel?: TestClass;
  testScope: string;
}) {
  const intl = useIntl();
  const { showExportReport, exportReport } = useExportReport<TestCaseDataType>({
    fileName: 'ApiExportTestReport',
    reportTitle: `# Api Export Test Report`,
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## Test Info`);
      markdown.push(`Test Device State: ${testModel}\n`);
      markdown.push(`Test Scope: ${testScope}\n`);

      markdown.push(``);

      markdown.push(`## Test Case`);
      markdown.push(`| State | Title | Expect | ErrorInfo |`);
      markdown.push(`| --- | --- | --- | --- |`);
      items.forEach(item => {
        const caseItem = item;
        const { title, result, $key } = caseItem;

        let expect = '';
        if (result.success) {
          expect = 'Call Success';
        } else if (result.requestPin) {
          expect = 'Require Input Pin';
        } else if (result.requestButton) {
          expect = 'Require Button Confirm';
        } else if (result.unknownMessage) {
          expect = 'UnknownMessage or Device Not Support';
        } else if (result.error) {
          expect = 'Call Error';
        }

        const state = itemVerifyState?.[$key].verify;

        const runnerResult = state === 'fail' ? itemVerifyState?.[$key].error : 'None';
        markdown.push(`| ${state} | ${title} | ${expect} | ${runnerResult} |`);
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

function ResultView({ item }: ResultViewProps) {
  const title = item?.title || item?.method;

  let result = '';
  if (item?.result?.success) {
    result = 'Call Success';
  } else if (item?.result?.requestPin) {
    result = 'Require Input Pin';
  } else if (item?.result?.requestButton) {
    result = 'Require Button Confirm';
  } else if (item?.result?.unknownMessage) {
    result = 'UnknownMessage or Device Not Support';
  } else if (item?.result?.error) {
    result = 'Call Error';
  }

  return (
    <>
      <View flexDirection="row">
        <Text fontSize={14}>{title}</Text>
      </View>
      <Text>Expected: {result}</Text>
    </>
  );
}

const testClassList = ['normal', 'bootloader'];

const testCaseMap = new Map<string, PlaygroundProps[]>();

testCaseMap.set('wipeDevice', wipeDevice);
testCaseMap.set('algo', algoApi);
testCaseMap.set('aptos', aptosApi);
testCaseMap.set('basic', basicApi);
testCaseMap.set('bitcoin', bitcoinApi);
testCaseMap.set('cardano', cardanoApi);
testCaseMap.set('conflux', confluxApi);
testCaseMap.set('cosmos', cosmosApi);
testCaseMap.set('crypto', cryptoApi);
testCaseMap.set('dynex', dynexApi);
testCaseMap.set('debug', debugApi);
testCaseMap.set('device', deviceApi);
testCaseMap.set('emmc', emmcApi);
testCaseMap.set('ethereum', ethereumApi);
testCaseMap.set('ethereumTrezor', ethereumTrezorApi);
testCaseMap.set('filecoin', filecoinApi);
testCaseMap.set('kaspa', kaspaApi);
testCaseMap.set('lightning', lightningApi);
testCaseMap.set('manager', managerApi);
testCaseMap.set('near', nearApi);
testCaseMap.set('nem', nemApi);
testCaseMap.set('nexa', nexaApi);
testCaseMap.set('nostr', nostrApi);
testCaseMap.set('other', otherApi);
testCaseMap.set('polkadot', polkadotApi);
testCaseMap.set('ripple', rippleApi);
testCaseMap.set('solana', solanaApi);
testCaseMap.set('starcoin', starcoinApi);
testCaseMap.set('stellar', stellarApi);
testCaseMap.set('sui', suiApi);
testCaseMap.set('tron', tronApi);

function getExpectResult(
  deviceType: TestDeviceType,
  testClass: TestClass,
  testExpect: TestDeviceExpect | undefined = undefined
) {
  let expect = testExpect?.[deviceType]?.[testClass];

  if (!expect) {
    expect = testExpect?.common?.[testClass];
  }

  if (expect && !!expect.skip) {
    return undefined;
  }

  if (!expect && testClass === 'bootloader') {
    return {
      unknownMessage: true,
    };
  }
  if (!expect && testClass === 'normal') {
    return {
      requestPin: true,
    };
  }

  return expect;
}

let hardwareUiEventListener: any | undefined;
function ExecuteView() {
  const intl = useIntl();
  const [currentTestClass, setCurrentTestClass] = useState<TestClass>('normal');
  const [currentTestCaseType, setCurrentTestCaseType] = useState<string>('all');
  const [normalNextDelayMsState, setNormalNextDelayMsState] = useState<string>('2500');
  const [bootNextDelayMsState, setBootNextDelayMsState] = useState<string>('500');

  const normalNextDelayMs = useRef('2500');
  const bootNextDelayMs = useRef('500');

  const errorCaseRef = useRef<TestCaseDataWithKey<TestCaseDataType>[]>([]);

  const nextRequestCleanUpRef = useRef(false);
  const currentRequestDeviceRef = useRef<TestDeviceType>(undefined);
  const currentRequestPinRef = useRef(false);
  const currentRequestButtonRef = useRef(false);

  useEffect(() => {
    normalNextDelayMs.current = normalNextDelayMsState;
  }, [normalNextDelayMsState]);

  useEffect(() => {
    bootNextDelayMs.current = bootNextDelayMsState;
  }, [bootNextDelayMsState]);

  function responseUiEventDelay() {
    let delayMs = 200;

    if (
      currentRequestDeviceRef.current === 'classic' ||
      currentRequestDeviceRef.current === 'classic1s' ||
      currentRequestDeviceRef.current === 'mini'
    ) {
      delayMs = 500;
    }

    // if (currentRequestDeviceRef.current === 'pro') {
    //   delayMs = 1000;
    // }

    return sleep(delayMs);
  }

  const responseNextTaskDelay = () => {
    let delayMs = 200;

    if (
      currentTestClass === 'normal' &&
      (currentRequestDeviceRef.current === 'classic' ||
        currentRequestDeviceRef.current === 'classic1s' ||
        currentRequestDeviceRef.current === 'mini')
    ) {
      delayMs = parseInt(normalNextDelayMs.current);
    }
    // if (currentTestClass === 'normal' && currentRequestDeviceRef.current === 'pro') {
    //   delayMs = 3000;
    // }

    if (
      currentTestClass === 'bootloader' &&
      (currentRequestDeviceRef.current === 'classic' ||
        currentRequestDeviceRef.current === 'classic1s' ||
        currentRequestDeviceRef.current === 'mini')
    ) {
      delayMs = parseInt(bootNextDelayMs.current);
    }

    // if (currentTestClass === 'bootloader' && currentRequestDeviceRef.current === 'pro') {
    //   delayMs = 500;
    // }

    return sleep(delayMs);
  };

  function addErrorCase(item: TestCaseDataWithKey<TestCaseDataType>) {
    errorCaseRef.current.push(item);
  }

  const { stopTest, beginTest } = useRunnerTest<TestCaseDataType>({
    initTestCase: async (context, sdk) => {
      const { connectId } = context;
      const res = await sdk.getFeatures(connectId ?? '', {
        retryCount: 1,
      });

      if (!res.success) {
        return Promise.resolve(undefined);
      }

      const feature = res.payload;
      const deviceType = getDeviceType(feature);
      const hasBootloaderMode = feature.bootloader_mode;

      currentRequestDeviceRef.current = deviceType;

      // lock device
      if (currentTestClass === 'normal' && !hasBootloaderMode && feature.unlocked === true) {
        await sdk.deviceLock(connectId ?? '', {
          retryCount: 1,
        });
      }

      // goto bootloader
      if (currentTestClass === 'bootloader' && !hasBootloaderMode) {
        await sdk.deviceUpdateReboot(connectId ?? '');
        await sleep(5 * 1000);
      }

      if (errorCaseRef.current?.length > 0) {
        const preErrorCase = errorCaseRef.current;
        errorCaseRef.current = [];
        return Promise.resolve({
          title: 'Api Export Test (Pre Error)',
          data: preErrorCase,
        });
      }

      const testCases: TestCaseDataWithKey<TestCaseDataType>[] = [];

      let testCaseData: PlaygroundProps[] = [];
      if (currentTestCaseType === 'all') {
        Array.from(testCaseMap.values()).forEach(item => {
          testCaseData.push(...item);
        });
      } else {
        testCaseData = testCaseMap.get(currentTestCaseType) ?? [];
      }

      testCaseData.forEach(item => {
        if (item.presupposes) {
          item.presupposes.forEach((presuppose, index) => {
            const key = `${item.method}-${presuppose.title}-${index}`;

            const expect = getExpectResult(deviceType, currentTestClass, presuppose.expect);

            if (!expect) {
              return;
            }
            if (expect.skip) {
              return;
            }

            testCases.push({
              title: key,
              method: item.method,
              noConnIdReq: item.noConnIdReq,
              noDeviceIdReq: item.noDeviceIdReq,
              params: presuppose.value,
              result: expect,
              $key: key,
            });
          });
        } else {
          const key = `${item.method}`;

          const expect = getExpectResult(deviceType, currentTestClass, item.expect);

          if (!expect) {
            return;
          }
          testCases.push({
            title: key,
            method: item.method,
            noConnIdReq: item.noConnIdReq,
            noDeviceIdReq: item.noDeviceIdReq,
            params: {},
            result: expect,
            $key: key,
          });
        }
      });

      return Promise.resolve({
        title: 'Api Export Test',
        data: testCases,
      });
    },
    initHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }

      hardwareUiEventListener = async (message: CoreMessage) => {
        console.log('TopLEVEL EVENT ===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          sdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PIN,
            payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
          });

          if (currentRequestPinRef.current) {
            const { connectId } = message.payload.device;

            await responseUiEventDelay();

            sdk.getFeatures(connectId, {
              retryCount: 1,
            });
          }
        } else if (message.type === 'ui-button') {
          if (currentRequestButtonRef.current) {
            const { connectId } = message.payload.device;

            await responseUiEventDelay();

            sdk.getFeatures(connectId, {
              retryCount: 1,
            });
          }
        }
      };

      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    prepareRunner: async (connectId, deviceId, features, sdk) => Promise.resolve(),
    prepareRunnerTestCase: async (sdk, connectId, item) => {
      // sleep
      if (
        nextRequestCleanUpRef.current ||
        currentRequestButtonRef.current ||
        currentRequestPinRef.current
      ) {
        await responseNextTaskDelay();
      }

      currentRequestPinRef.current = item?.result?.requestPin || false;
      currentRequestButtonRef.current = item?.result?.requestButton || false;
      nextRequestCleanUpRef.current = false;

      return Promise.resolve();
    },
    generateRequestParams: item => {
      const { params } = item;
      const requestParams = {
        ...params,
        passphraseState: undefined,
        useEmptyPassphrase: true,
      };
      return Promise.resolve({
        method: item.method,
        params: requestParams,
      });
    },
    processRequest: async (
      sdk,
      method,
      connectId,
      deviceId,
      requestParams,
      item
    ): Promise<{
      payload: any;
      skipVerify: boolean;
    }> => {
      const sdkPromise = async () => {
        try {
          let res;
          if (item.noConnIdReq) {
            // @ts-expect-error
            res = await sdk[`${method}` as keyof typeof sdk]();
          } else if (item.noDeviceIdReq) {
            // @ts-expect-error
            res = await sdk[`${method}` as keyof typeof sdk](connectId, requestParams);
          } else {
            // @ts-expect-error
            res = await sdk[`${method}` as keyof typeof sdk](connectId, deviceId, requestParams);
          }
          return { payload: res, skipVerify: true };
        } catch (error) {
          addErrorCase(item);
          console.log('=====>>>>> processRequest error: ', error);
          return {
            payload: {
              success: false,
              payload: {
                code: 800,
                error,
              },
            },
            skipVerify: true,
          };
        }
      };

      const result = await withTimeout(sdkPromise(), 30 * 1000);

      if (result === 'timeout') {
        addErrorCase(item);

        // clean up device
        nextRequestCleanUpRef.current = true;
        sdk.getFeatures(connectId, {
          retryCount: 1,
        });
        return {
          payload: {
            success: false,
            payload: {
              code: 'timeout',
              error: 'Operation timed out after 30 seconds',
            },
          },
          skipVerify: true,
        };
      }

      return result;
    },
    processResponse: (payload, item, itemIndex, res) => {
      let error = '';
      let verifyState: VerifyState = 'none';

      console.log('=====>>>>> processResponse: ', item.result, res);

      if (res.payload?.code === 'timeout') {
        verifyState = 'fail';
        error = res.payload?.error;
        addErrorCase(item);
      } else if (item.result.error && (res.payload?.code === 800 || res.success === false)) {
        verifyState = 'success';
      } else if (item.result.success && res.success) {
        verifyState = 'success';
      } else if (
        item.result.requestPin &&
        !res.success &&
        (res.payload.code === 107 || res.payload?.code === 802 || res.payload?.code === 803)
      ) {
        verifyState = 'success';
      } else if (
        item.result.requestButton &&
        !res.success &&
        (res.payload.code === 107 || res.payload?.code === 802 || res.payload?.code === 803)
      ) {
        verifyState = 'success';
      } else if (
        item.result.unknownMessage &&
        !res.success &&
        (res.payload.error.includes('Failure_UnexpectedMessage') ||
          res.payload.error.includes('unsupport') ||
          res.payload.error.includes('no such type'))
      ) {
        verifyState = 'success';
      } else {
        verifyState = 'fail';
        error = JSON.stringify(res.payload, null, 2);
        addErrorCase(item);
      }

      return Promise.resolve({
        verifyState,
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

  return (
    <>
      <Text fontSize={13} paddingVertical="$2">
        {`deviceWipe (抹除设备)、firmwareErase (抹除固件)、firmwareEraseEx (抹除 BLE固件)、reboot (重启)\n\n上述方法在批量测试中跳过了，因为这些方法会导致设备状态异常，后续的测试无法继续进行。单独放到了 wipeDevice 下面。\n\n初版测试工具 bootloader 模式下的测试，需要手动进入 boot 模式。`}
      </Text>
      <Text fontSize={13} paddingVertical="$2">{`${currentTestClass}-${currentTestCaseType}`}</Text>
      <Stack flex={1} flexDirection="row" flexWrap="wrap" gap="$2">
        <Picker
          style={{ width: 200 }}
          selectedValue={currentTestClass}
          onValueChange={itemValue => {
            setCurrentTestClass(itemValue);
          }}
        >
          {testClassList.map((testCase, index) => (
            <Picker.Item key={`${index}`} label={testCase} value={testCase} />
          ))}
        </Picker>
        <Picker
          style={{ width: 200 }}
          selectedValue={currentTestCaseType}
          onValueChange={itemValue => {
            setCurrentTestCaseType(itemValue);
          }}
        >
          <Picker.Item key={`${0}`} label="all" value="all" />
          {Array.from(testCaseMap.keys()).map((testCase, index) => (
            <Picker.Item key={`${index + 1}`} label={testCase} value={testCase} />
          ))}
        </Picker>
        <CommonInput
          label="普通模式延迟时间(ms) (classic、1s、mini)"
          value={normalNextDelayMsState}
          type="number"
          onChange={setNormalNextDelayMsState}
        />
        <CommonInput
          label="boot 模式延迟时间(ms) (classic、1s、mini)"
          value={bootNextDelayMsState}
          type="number"
          onChange={setBootNextDelayMsState}
        />
        <TestRunnerOptionButtons onStop={stopTest} onStart={beginTest} />
        <ExportReportView testScope={currentTestCaseType} testModel={currentTestClass} />
        <TestRunnerErrorButtons
          onStart={beginTest}
          onExistsErrorCase={() => errorCaseRef.current.length > 0}
        />
      </Stack>
    </>
  );
}

export default function TestApiExport() {
  return (
    <TestRunnerView<TestCaseDataType[]>
      title="Api Export Test"
      renderExecuteView={() => <ExecuteView />}
      renderResultView={item => <ResultView item={item} />}
    />
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | 'timeout'> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<'timeout'>(resolve => {
    timeoutHandle = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).then(result => {
    clearTimeout(timeoutHandle); // 清除超时计时器
    return result;
  });
}

function sleep(ms = 100) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise(resolve => setTimeout(resolve, ms));
}
