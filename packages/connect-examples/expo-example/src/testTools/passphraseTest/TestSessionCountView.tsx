import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CoreMessage, Features, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

import { Picker } from '@react-native-picker/picker';
import { Stack, Text, View, XStack, YStack } from 'tamagui';
import { useIntl } from 'react-intl';
import { TestChain, requestAddress } from './utils';
import { useDevice } from '../../provider/DeviceProvider';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import AutoWrapperTextArea from '../../components/ui/AutoWrapperTextArea';
import { Button } from '../../components/ui/Button';
import PanelView from '../../components/ui/Panel';
import { getDeviceInfo } from '../../components/BaseTestRunner/utils';
import { downloadFile } from '../../utils/downloadUtils';
import { SwitchInput } from '../../components/SwitchInput';
import TestRunnerOptionButtons from '../../components/BaseTestRunner/TestRunnerOptionButtons';

function generatePassphrase(list: any[] | undefined) {
  return `$A& b${(list?.length ?? 0) + 1}`;
}

function ExportReportView({
  value,
  testCoin,
  deviceFeatures,
}: {
  value: string;
  testCoin: string;
  deviceFeatures: Features;
}) {
  const intl = useIntl();

  const exportReport = useCallback(() => {
    const markdown = [];
    markdown.push(`# Passphrase Count Test (${testCoin})`);

    markdown.push(`## Device Info`);
    const deviceInfo = getDeviceInfo(deviceFeatures);
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

    markdown.push(value);

    const formatTime = Date.now();
    const downloadFileName = `Passphrase Count Test (${testCoin})${formatTime}.md`;

    downloadFile(downloadFileName, markdown.join('\n').toString());
  }, [deviceFeatures, testCoin, value]);

  return (
    <Button variant="primary" onPress={exportReport}>
      {intl.formatMessage({ id: 'action__export_report' })}
    </Button>
  );
}

let hardwareUiEventListener: any | undefined;
export default function TestSessionCountView() {
  const intl = useIntl();
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const [testChain, setTestChain] = useState<TestChain>('btc');
  const [showOnOneKey, setShowOnOnekey] = useState<boolean>(false);
  const [runnerLog, setRunnerLog] = useState<string[]>([]);
  const deviceFeatures = useRef<Features>();

  const appendLastRunnerLog = useCallback((params: string[]) => {
    setRunnerLog(pre => {
      if (pre.length === 0) {
        return [params.join('')];
      }

      return [...pre.slice(0, pre.length - 1), `${pre[pre.length - 1]}${params.join('')}`];
    });
  }, []);

  const pushRunnerLog = useCallback((params: string[]) => {
    setRunnerLog(pre => [...pre, params.join('')]);
  }, []);

  const allowInputPassphrase = useRef<boolean>(false);
  const hasContinue = useRef<boolean>(false);
  const testResult = useRef<{
    done?: boolean;
    payload: string;
  }>();

  const passphraseStateList = useRef<
    {
      walletName: string;
      passphraseState: string;
      address: string;
    }[]
  >([]);

  const stopTest = useCallback(() => {
    if (hardwareUiEventListener) {
      SDK?.off(UI_EVENT, hardwareUiEventListener);
    }
    SDK?.cancel();

    hasContinue.current = false;
    testResult.current = {
      done: true,
      payload: intl.formatMessage({ id: 'message__test_end' }),
    };

    pushRunnerLog([intl.formatMessage({ id: 'message__test_end' })]);
  }, [SDK, intl, pushRunnerLog]);

  const testSessionCount = useCallback(async () => {
    if (!SDK) return;

    const connectId = selectedDevice?.connectId ?? '';
    setRunnerLog([intl.formatMessage({ id: 'message__scan_device_doing' })]);

    if (hardwareUiEventListener) {
      SDK.off(UI_EVENT, hardwareUiEventListener);
    }

    // refresh device
    const featuresRes = await SDK.getFeatures(connectId);
    if (!featuresRes.success) {
      pushRunnerLog([
        intl.formatMessage({ id: 'message__get_features_error' }),
        featuresRes?.payload?.error,
      ]);
      return;
    }
    const deviceId = featuresRes.payload?.device_id ?? '';

    passphraseStateList.current = [];
    testResult.current = {
      done: false,
      payload: intl.formatMessage({ id: 'message__testing' }),
    };

    setRunnerLog([intl.formatMessage({ id: 'message__begin_test' })]);

    hardwareUiEventListener = (message: CoreMessage) => {
      console.log('TopLEVEL EVENT ===>>>>: ', message);
      if (message.type === UI_REQUEST.REQUEST_PIN) {
        SDK.uiResponse({
          type: UI_RESPONSE.RECEIVE_PIN,
          payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
        });
      }
      if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
        if (!allowInputPassphrase.current) {
          hasContinue.current = false;

          pushRunnerLog([
            intl.formatMessage({ id: 'message__test_result' }),
            ', ',
            intl.formatMessage({
              id: 'message__passphrase_stop_test',
            }),
            passphraseStateList.current.length.toString(),
          ]);
          stopTest();
          return;
        }

        setTimeout(() => {
          SDK.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: generatePassphrase(passphraseStateList.current),
            },
          });
        }, 200);
      }
    };
    SDK.on(UI_EVENT, hardwareUiEventListener);

    if (!featuresRes.payload.passphrase_protection) {
      await SDK.deviceSettings(connectId, {
        usePassphrase: true,
      });
    }

    deviceFeatures.current = featuresRes.payload;
    hasContinue.current = true;
    while (hasContinue.current) {
      allowInputPassphrase.current = true;
      const walletName = `Wallet-${passphraseStateList.current.length + 1}`;
      pushRunnerLog([
        intl.formatMessage({ id: 'message__generate_wallet' }),
        walletName,
        ' => Passphrase:',
        `「${generatePassphrase(passphraseStateList.current)}」`,
      ]);

      const passphraseStateRes = await SDK.getPassphraseState(connectId, {
        initSession: true,
      });
      if (!passphraseStateRes.success) {
        hasContinue.current = false;
        testResult.current = {
          done: true,
          payload: `${intl.formatMessage({
            id: 'message__generate_wallet_error',
          })} ${passphraseStateRes?.payload?.error}`,
        };

        appendLastRunnerLog([
          intl.formatMessage({ id: 'message__generate_wallet_error' }),
          passphraseStateRes?.payload?.error,
        ]);
        break;
      }

      if (!passphraseStateRes.payload) {
        hasContinue.current = false;
        testResult.current = {
          done: true,
          payload: 'passphrase is not enabled on the device.',
        };
        stopTest();
        break;
      }

      const passphraseState: string = passphraseStateRes.payload;

      appendLastRunnerLog([' PassphraseState: ', passphraseState]);

      allowInputPassphrase.current = false;
      pushRunnerLog([
        '    ',
        intl.formatMessage({ id: 'message__fetch' }),
        ` ${walletName} `,
        intl.formatMessage({ id: 'message__address' }),
      ]);
      const addressRes = await requestAddress({
        sdk: SDK,
        testChain,
        connectId,
        deviceId,
        passphraseState,
        showOnOneKey,
      });

      if (!addressRes.success) {
        hasContinue.current = false;
        testResult.current = {
          done: true,
          payload: `GetAddress ${intl.formatMessage({ id: 'message__fail' })} ${
            addressRes?.payload?.error
          }`,
        };
        appendLastRunnerLog([
          intl.formatMessage({ id: 'message__fail' }),
          addressRes?.payload?.error,
        ]);
        break;
      }

      appendLastRunnerLog([
        `${intl.formatMessage({ id: 'message__success' })} `,
        intl.formatMessage({ id: 'message__address' }),
        ':',
        addressRes.payload.address ?? '',
      ]);

      // 查看一下之前的 passphraseState 是否还能用
      allowInputPassphrase.current = false;
      for (const item of [...passphraseStateList.current].reverse()) {
        pushRunnerLog([
          '    ',
          intl.formatMessage({ id: 'message__fetch' }),
          ` ${item.walletName} `,
          intl.formatMessage({ id: 'message__address' }),
        ]);

        const addressRes = await requestAddress({
          sdk: SDK,
          testChain,
          connectId,
          deviceId,
          passphraseState: item.passphraseState,
          showOnOneKey,
        });

        if (!addressRes.success) {
          hasContinue.current = false;
          testResult.current = {
            done: true,
            payload: `address:${item.address} passphrase:${item.passphraseState} ${testChain} GetAddress 失败 ${addressRes?.payload?.error}`,
          };

          appendLastRunnerLog([
            intl.formatMessage({ id: 'message__fail' }),
            addressRes?.payload?.error,
          ]);
          break;
        }

        if (item.address !== addressRes.payload.address) {
          hasContinue.current = false;

          testResult.current = {
            done: true,
            payload: `address:${item.address} passphrase:${
              item.passphraseState
            } ${testChain} GetAddress ${intl.formatMessage({
              id: 'message__address_not_match',
            })}!!!!`,
          };

          appendLastRunnerLog([
            intl.formatMessage({ id: 'message__success' }),
            ` ${intl.formatMessage({ id: 'message__address_not_match' })} `,
            ' expect:',
            item.address,
            ' actual:',
            addressRes.payload.address ?? '',
          ]);
          break;
        }

        appendLastRunnerLog([
          `${intl.formatMessage({ id: 'message__success' })} `,
          intl.formatMessage({ id: 'message__address' }),
          ':',
          addressRes.payload.address ?? '',
        ]);
      }

      passphraseStateList.current.push({
        walletName,
        passphraseState,
        address: addressRes.payload.address ?? '',
      });
    }
  }, [
    SDK,
    appendLastRunnerLog,
    intl,
    pushRunnerLog,
    selectedDevice?.connectId,
    showOnOneKey,
    stopTest,
    testChain,
  ]);

  const runnerLogViewMemo = useMemo(
    () => (
      <Stack width="100%">
        <AutoWrapperTextArea
          value={runnerLog.join('\n')}
          editable={false}
          placeholder={intl.formatMessage({ id: 'label__will_response_tip' })}
        />
      </Stack>
    ),
    [intl, runnerLog]
  );

  const runnerExportReportMemo = useMemo(() => {
    if (testResult?.current?.done !== true) {
      return null;
    }
    if (!deviceFeatures.current) {
      return null;
    }

    return (
      <ExportReportView
        value={runnerLog.join('\n')}
        testCoin={testChain}
        deviceFeatures={deviceFeatures.current}
      />
    );
  }, [runnerLog, testChain]);

  const ContentView = useMemo(() => {
    let result;
    if (testResult?.current?.done === undefined) {
      result = '';
    } else if (testResult?.current?.done) {
      result = intl.formatMessage({ id: 'message__done' });
    } else {
      result = intl.formatMessage({ id: 'message__testing' });
    }

    return (
      <PanelView title={intl.formatMessage({ id: 'title__passphrase_test' })}>
        <View gap="$2">
          <YStack>
            <Text>{intl.formatMessage({ id: 'message__passphrase_count_test_describe' })}</Text>
            <Text fontSize={14}>
              {intl.formatMessage({ id: 'message__passphrase_count_test_step1' })}
            </Text>
            <Text fontSize={14}>
              {intl.formatMessage({ id: 'message__passphrase_count_test_step2' })}
            </Text>
            <Text fontSize={14}>
              {intl.formatMessage({ id: 'message__passphrase_count_test_step3' })}
            </Text>
          </YStack>

          <XStack gap="$2" flexWrap="wrap">
            <Picker
              style={{ width: 200 }}
              selectedValue={testChain}
              onValueChange={itemValue => setTestChain(itemValue)}
            >
              <Picker.Item label="BTC(Secp256k1)" value="btc" />
              <Picker.Item label="EVM(Secp256k1)" value="evm" />
              <Picker.Item label="DOT(ED25519)" value="dot" />
              <Picker.Item label="ADA" value="ada" />
            </Picker>

            <SwitchInput
              label={intl.formatMessage({ id: 'label__show_on_onekey' })}
              value={showOnOneKey}
              onToggle={setShowOnOnekey}
            />

            <TestRunnerOptionButtons onStop={stopTest} onStart={testSessionCount} />
            {runnerExportReportMemo}
          </XStack>

          {runnerLogViewMemo}
        </View>
      </PanelView>
    );
  }, [
    intl,
    testChain,
    showOnOneKey,
    testSessionCount,
    stopTest,
    runnerExportReportMemo,
    runnerLogViewMemo,
  ]);

  return ContentView;
}
