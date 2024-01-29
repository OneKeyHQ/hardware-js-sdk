import { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE, getDeviceType } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';
import { useContextSelector } from 'use-context-selector';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import { ApiExportTestCase } from './types';
import { TestCaseDataWithKey, VerifyState } from '../../components/BaseTestRunner/types';
import { PlaygroundProps, TestDeviceExpect, TestDeviceType } from '../../components/Playground';

import deviceApi from '../../data/device';
import managerApi from '../../data/manager';
import algoApi from '../../data/algo';
import aptosApi from '../../data/aptos';
import basicApi from '../../data/basic';
import bitcoinApi from '../../data/bitcoin';
import cardanoApi from '../../data/cardano';
import confluxApi from '../../data/conflux';
import cosmosApi from '../../data/cosmos';
import cryptoApi from '../../data/crypto';
import debugApi from '../../data/debug';
import emmcApi from '../../data/emmc';
import ethereumApi from '../../data/ethereum';
import ethereumTrezorApi from '../../data/ethereumTrezor';
import filecoinApi from '../../data/filecoin';
import kaspaApi from '../../data/kaspa';
import lightningApi from '../../data/lightning';
import nearApi from '../../data/near';
import nemApi from '../../data/nem';
import nexaApi from '../../data/nexa';
import nostrApi from '../../data/nostr';
import otherApi from '../../data/other';
import polkadotApi from '../../data/polkadot';
import rippleApi from '../../data/ripple';
import solanaApi from '../../data/solana';
import starcoinApi from '../../data/starcoin';
import stellarApi from '../../data/stellar';
import suiApi from '../../data/sui';
import tronApi from '../../data/tron';
import { downloadFile } from '../../utils/downloadUtils';
import { TestRunnerContext } from '../../components/BaseTestRunner/Context/TestRunnerProvider';
import { TestRunnerVerifyContext } from '../../components/BaseTestRunner/Context/TestRunnerVerifyProvider';
import { getDeviceInfo } from '../../components/BaseTestRunner/utils';

type TestCaseDataType = ApiExportTestCase['data'][0];
type ResultViewProps = { item: TestCaseDataWithKey<TestCaseDataType> };

type TestClass = 'normal' | 'bootloader';

function ExportReportView({
  testModel = 'normal',
  testScope = 'all',
}: {
  testModel?: TestClass;
  testScope: string;
}) {
  const runnerInfo = useContextSelector(TestRunnerContext, v => v);
  const runnerVerify = useContextSelector(TestRunnerVerifyContext, v => v);

  const exportReport = () => {
    const {
      runnerTestCaseTitle,
      timestampBeginTest,
      timestampEndTest,
      itemValues,
      runningDeviceFeatures,
    } = runnerInfo;

    const { itemVerifyState } = runnerVerify;

    if (!itemVerifyState) return;
    if (!timestampBeginTest) return;
    if (!timestampEndTest) return;
    if (!runningDeviceFeatures) return;

    const beginTime = new Date(timestampBeginTest).toLocaleString();
    const endTime = new Date(timestampEndTest).toLocaleString();

    const allSuccess = itemValues.every(item => {
      const caseItem = item as TestCaseDataWithKey<TestCaseDataType>;
      const { $key } = caseItem;
      const state = itemVerifyState?.[$key].verify;
      return state === 'success';
    });

    const markdown = [];
    markdown.push(`# Api Export Test Report (${runnerTestCaseTitle})`);
    markdown.push(`Status: ${allSuccess ? 'Success' : 'Fail'}\n`);
    markdown.push(`Test Device State: ${testModel}\n`);
    markdown.push(`Test Scope: ${testScope}\n`);
    markdown.push(`Begin Time: ${beginTime}\n`);
    markdown.push(`End Time: ${endTime}\n`);
    markdown.push(``);

    markdown.push(`## Device Info`);
    const deviceInfo = getDeviceInfo(runningDeviceFeatures);
    markdown.push(`| Key | Value |`);
    markdown.push(`| --- | --- |`);
    Object.keys(deviceInfo).forEach(key => {
      // @ts-expect-error
      const value = deviceInfo[key];
      if (value) {
        markdown.push(`| ${key} | ${value} |`);
      }
    });
    markdown.push(``);

    markdown.push(`## Test Case`);
    markdown.push(`| State | Title | Expect | ErrorInfo |`);
    markdown.push(`| --- | --- | --- | --- |`);
    itemValues.forEach(item => {
      const caseItem = item as TestCaseDataWithKey<TestCaseDataType>;
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

    const testCaseTitle = runnerTestCaseTitle?.replace(/-/g, '_');
    const formatTime = new Date(timestampBeginTest).toLocaleString().replace(/[-: ]/g, '_');
    const fileName = `ApiExportTestReport(${testCaseTitle})${formatTime}.md`;

    downloadFile(fileName, markdown.join('\n').toString());
  };

  if (runnerInfo.runnerDone) {
    return <Button title="Export Report" onPress={exportReport} />;
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
      <View style={{ flexDirection: 'row' }}>
        <Text>{title}</Text>
      </View>

      <Text>Expected: {result}</Text>
    </>
  );
}

const testClassList = ['normal', 'bootloader'];

const testCaseMap = new Map<string, PlaygroundProps[]>();

testCaseMap.set('algo', algoApi);
testCaseMap.set('aptos', aptosApi);
testCaseMap.set('basic', basicApi);
testCaseMap.set('bitcoin', bitcoinApi);
testCaseMap.set('cardano', cardanoApi);
testCaseMap.set('conflux', confluxApi);
testCaseMap.set('cosmos', cosmosApi);
testCaseMap.set('crypto', cryptoApi);
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

function ExecuteView() {
  const [currentTestClass, setCurrentTestClass] = useState<TestClass>('normal');
  const [currentTestCaseType, setCurrentTestCaseType] = useState<string>('all');

  const nextRequestCleanUpRef = useRef(false);
  const currentRequestDeviceRef = useRef<TestDeviceType>(undefined);
  const currentRequestPinRef = useRef(false);
  const currentRequestButtonRef = useRef(false);

  function responseUiEventDelay() {
    let delayMs = 200;

    if (
      currentRequestDeviceRef.current === 'classic' ||
      currentRequestDeviceRef.current === 'classic1s' ||
      currentRequestDeviceRef.current === 'mini'
    ) {
      delayMs = 500;
    }

    return sleep(delayMs);
  }

  function responseNextTaskDelay() {
    let delayMs = 200;

    if (
      currentTestClass === 'normal' &&
      (currentRequestDeviceRef.current === 'classic' ||
        currentRequestDeviceRef.current === 'classic1s' ||
        currentRequestDeviceRef.current === 'mini')
    ) {
      delayMs = 2500;
    }

    if (
      currentTestClass === 'bootloader' &&
      (currentRequestDeviceRef.current === 'classic' ||
        currentRequestDeviceRef.current === 'classic1s' ||
        currentRequestDeviceRef.current === 'mini')
    ) {
      delayMs = 500;
    }

    return sleep(delayMs);
  }

  const { stopTest, beginTest } = useRunnerTest<TestCaseDataType>({
    initTestCase: async (sdk, connectId) => {
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
        await sdk.deviceUpdateReboot(connectId ?? '', {
          retryCount: 1,
        });
        await sleep(5 * 1000);
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
      sdk.on(UI_EVENT, async (message: CoreMessage) => {
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
      });
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
      }

      return Promise.resolve({
        verifyState,
        error,
      });
    },
  });

  return (
    <>
      <Text style={{ fontSize: 14, paddingTop: 8, paddingBottom: 8 }}>
        {`deviceWipe (抹除设备)、firmwareErase (抹除固件)、firmwareEraseEx (抹除 BLE固件)、reboot (重启)\n\n上述方法在批量测试中跳过了，因为这些方法会导致设备状态异常，后续的测试无法继续进行。\n初版测试工具 bootloader 模式下的测试，需要手动进入 boot 模式。`}
      </Text>
      <Text
        style={{ fontSize: 14, paddingTop: 8, paddingBottom: 8 }}
      >{`${currentTestClass}-${currentTestCaseType}`}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Picker
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
        <Button title="Start Test" onPress={beginTest} />
        <Button title="Stop Test" onPress={stopTest} />
        <ExportReportView testScope={currentTestCaseType} testModel={currentTestClass} />
      </View>
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
