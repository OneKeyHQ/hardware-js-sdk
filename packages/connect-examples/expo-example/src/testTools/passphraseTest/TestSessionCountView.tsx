import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { OpenWalletSessionMode, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Picker } from '@react-native-picker/picker';
import { Stack, Text, View, XStack, YStack } from 'tamagui';
import { useIntl } from 'react-intl';

import { requestAddress } from './utils';
import { useDevice } from '../../provider/DeviceProvider';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import AutoWrapperTextArea from '../../components/ui/AutoWrapperTextArea';
import { Button } from '../../components/ui/Button';
import PanelView from '../../components/ui/Panel';
import { downloadFile } from '../../utils/downloadUtils';
import { SwitchInput } from '../../components/SwitchInput';
import { getDeviceInfo } from '../../utils/deviceUtils';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';
import {
  getProtocolAwareFeatures,
  isPassphraseProtectionEnabled,
} from '../../utils/protocolAwareFeatures';

import type { TestChain } from './utils';
import type { CoreMessage, Features } from '@onekeyfe/hd-core';

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
    const deviceInfo = getDeviceInfo(deviceFeatures, undefined);
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
  const { openDialog } = useHardwareInputPinDialog();

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

  const stopTest = useCallback(async () => {
    if (hardwareUiEventListener) {
      SDK?.off(UI_EVENT, hardwareUiEventListener);
    }

    hasContinue.current = false;
    testResult.current = {
      done: true,
      payload: intl.formatMessage({ id: 'message__test_end' }),
    };

    pushRunnerLog([intl.formatMessage({ id: 'message__test_end' })]);

    const connectId = selectedDevice?.connectId ?? '';
    if (!SDK || !connectId) return;

    // Mirror the recovery used in blindSignature/automationTest timeout
    // handlers: cancel(connectId) rejects pending requests and fires
    // interruptionFromUser; the awaited protocol-aware refresh drains legacy
    // V1 bytes and refreshes the canonical state on Protocol V2.
    SDK.cancel(connectId);
    try {
      await getProtocolAwareFeatures(
        SDK,
        connectId,
        { retryCount: 1 },
        selectedDevice?.connectProtocol
      );
    } catch {
      // Defensive: the refresh normally resolves, but a transport race during
      // cancel can occasionally surface as a throw
    }
  }, [SDK, intl, pushRunnerLog, selectedDevice?.connectId, selectedDevice?.connectProtocol]);

  const testSessionCount = useCallback(async () => {
    if (!SDK) return;

    const connectId = selectedDevice?.connectId ?? '';
    setRunnerLog([intl.formatMessage({ id: 'message__scan_device_doing' })]);

    if (hardwareUiEventListener) {
      SDK.off(UI_EVENT, hardwareUiEventListener);
    }

    // Defensive resync before each run: if a prior run (possibly on a
    // different chain) was interrupted mid-exchange, the transport may still
    // hold leftover bytes and the first state refresh would decode a half-frame
    // and throw "Didn't receive expected header signature.".
    if (connectId) {
      SDK.cancel(connectId);
    }

    // refresh device
    const featuresRes = await getProtocolAwareFeatures(
      SDK,
      connectId,
      { retryCount: 1 },
      selectedDevice?.connectProtocol
    );
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
        openDialog(SDK, message.payload.device.features, message);
      }
      if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
        if (!allowInputPassphrase.current) {
          // Device re-asking passphrase during verification = session slot
          // evicted = expected end of round. Don't synchronously cancel
          // here: the device is mid-exchange waiting for our reply, and
          // racing cancel against that exchange is what leaves the
          // transport dirty (root cause of the "Didn't receive expected
          // header signature." error when switching chains). Reply with
          // an empty passphrase so the device's current call completes
          // cleanly; the outer loop drops out via hasContinue.
          hasContinue.current = false;
          testResult.current = {
            done: true,
            payload: intl.formatMessage({ id: 'message__test_end' }),
          };

          pushRunnerLog([
            intl.formatMessage({ id: 'message__test_result' }),
            ', ',
            intl.formatMessage({
              id: 'message__passphrase_stop_test',
            }),
            passphraseStateList.current.length.toString(),
          ]);

          setTimeout(() => {
            SDK.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: { value: '' },
              ...(message.payload.responseCorrelation ?? {}),
            });
          }, 200);
          return;
        }

        setTimeout(() => {
          SDK.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: generatePassphrase(passphraseStateList.current),
            },
            ...(message.payload.responseCorrelation ?? {}),
          });
        }, 200);
      }
    };
    SDK.on(UI_EVENT, hardwareUiEventListener);

    if (!isPassphraseProtectionEnabled(featuresRes.payload)) {
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

      const walletSessionRes = await SDK.openWalletSession(connectId, {
        mode: OpenWalletSessionMode.SelectHidden,
      });
      if (!walletSessionRes.success) {
        hasContinue.current = false;
        testResult.current = {
          done: true,
          payload: `${intl.formatMessage({
            id: 'message__generate_wallet_error',
          })} ${walletSessionRes?.payload?.error}`,
        };

        appendLastRunnerLog([
          intl.formatMessage({ id: 'message__generate_wallet_error' }),
          walletSessionRes?.payload?.error,
        ]);
        break;
      }
      if (walletSessionRes.payload.walletType !== 'hidden') {
        hasContinue.current = false;
        testResult.current = {
          done: true,
          payload: 'openWalletSession did not return a hidden wallet.',
        };
        appendLastRunnerLog(['openWalletSession did not return a hidden wallet.']);
        break;
      }

      const { passphraseState } = walletSessionRes.payload;

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
        if (!hasContinue.current) break;

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

        // Listener may have flipped hasContinue while this call was in
        // flight (= session evicted mid-verification). The response came
        // from an empty-passphrase reply, so it isn't meaningful — exit
        // silently instead of misreporting address_not_match.
        if (!hasContinue.current) break;

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

      // Don't record this wallet if the listener ended the test mid-round.
      if (!hasContinue.current) break;

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
    openDialog,
    pushRunnerLog,
    selectedDevice?.connectId,
    selectedDevice?.connectProtocol,
    showOnOneKey,
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

  const ContentView = useMemo(
    () => (
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
            <Button variant="primary" onPress={testSessionCount}>
              {intl.formatMessage({ id: 'action__start_test' })}
            </Button>
            <Button variant="destructive" onPress={stopTest}>
              {intl.formatMessage({ id: 'action__stop_test' })}
            </Button>
            {runnerExportReportMemo}
          </XStack>

          {runnerLogViewMemo}
        </View>
      </PanelView>
    ),
    [
      intl,
      testChain,
      showOnOneKey,
      testSessionCount,
      stopTest,
      runnerExportReportMemo,
      runnerLogViewMemo,
    ]
  );

  return ContentView;
}
