import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Button, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { TestChain, requestAddress, styles } from './utils';
import { useDevice } from '../../provider/DeviceProvider';
import HardwareSDKContext from '../../provider/HardwareSDKContext';

export default function TestSessionView() {
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const [testChain, setTestChain] = useState<TestChain>('btc');

  const allowInputPassphrase = useRef<boolean>(false);
  const hasContinue = useRef<boolean>(false);
  const [testSessionCountResult, setTestSessionCountResult] = useState<{
    done?: boolean;
    payload: string;
  }>();

  const passphraseStateList = useRef<
    {
      passphraseState: string;
      address: string;
    }[]
  >([]);

  useEffect(() => {
    if (testSessionCountResult?.done && !!SDK) {
      SDK.removeAllListeners(UI_EVENT);
    }
  }, [SDK, testSessionCountResult?.done]);

  const testSessionCount = useCallback(async () => {
    const connectId = selectedDevice?.connectId ?? '';

    if (!SDK) return;

    SDK.removeAllListeners(UI_EVENT);

    // refresh device
    const featuresRes = await SDK.getFeatures(connectId);
    const deviceId = featuresRes.payload?.device_id ?? '';

    passphraseStateList.current = [];
    setTestSessionCountResult({
      done: false,
      payload: '测试中...',
    });

    SDK.on(UI_EVENT, (message: CoreMessage) => {
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
          setTestSessionCountResult({
            done: true,
            payload: '测试完成',
          });
          SDK.cancel();
          return;
        }

        setTimeout(() => {
          SDK.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: `${(passphraseStateList.current?.length ?? 0) + 1}`,
            },
          });
        }, 200);
      }
    });

    hasContinue.current = true;
    while (hasContinue.current) {
      allowInputPassphrase.current = true;
      const passphraseStateRes = await SDK.getPassphraseState(connectId, {
        initSession: true,
      });
      if (!passphraseStateRes.success) {
        hasContinue.current = false;
        setTestSessionCountResult({
          done: true,
          payload: `getPassphraseState failed ${passphraseStateRes?.payload?.error}`,
        });
        break;
      }
      if (!passphraseStateRes.payload) {
        hasContinue.current = false;
        setTestSessionCountResult({
          done: true,
          payload: 'passphrase is not enabled on the device.',
        });
        break;
      }

      const passphraseState: string = passphraseStateRes.payload;

      allowInputPassphrase.current = false;
      const addressRes = await requestAddress({
        sdk: SDK,
        testChain,
        connectId,
        deviceId,
        passphraseState,
      });

      if (!addressRes.success) {
        hasContinue.current = false;
        setTestSessionCountResult({
          done: true,
          payload: `GetAddress 失败 ${addressRes?.payload?.error}`,
        });
        break;
      }

      // 查看一下之前的 passphraseState 是否还能用
      allowInputPassphrase.current = false;
      for (const item of passphraseStateList.current) {
        const addressRes = await requestAddress({
          sdk: SDK,
          testChain,
          connectId,
          deviceId,
          passphraseState: item.passphraseState,
        });

        if (!addressRes.success) {
          hasContinue.current = false;
          setTestSessionCountResult({
            done: true,
            payload: `address:${item.address} passphrase:${item.passphraseState} ${testChain} GetAddress 失败 ${addressRes?.payload?.error}`,
          });
          break;
        }

        if (item.address !== addressRes.payload.address) {
          hasContinue.current = false;
          console.log('Test list:', passphraseStateList.current);
          setTestSessionCountResult({
            done: true,
            payload: `address:${item.address} passphrase:${item.passphraseState} ${testChain} GetAddress 结果不一致!!!!`,
          });
          break;
        }
      }

      passphraseStateList.current.push({
        passphraseState,
        address: addressRes.payload.address ?? '',
      });
    }
  }, [SDK, selectedDevice?.connectId, testChain]);

  const ContentView = useMemo(() => {
    let result;
    if (testSessionCountResult?.done === undefined) {
      result = '未测试';
    } else if (testSessionCountResult?.done) {
      result = '完成';
    } else {
      result = '进行中';
    }

    return (
      <View style={styles.subContainer}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Passphrase Session Test</Text>
        <Text>开始之后根据提示解锁硬件, 根据硬件提示确认 passphrase, 不用自己输入</Text>
        <Text>
          测试步骤：1. 从零开始创建钱包 passphrase 并记录下来，注意在硬件按确认 passphrase
        </Text>
        <Text>
          2. 每次创建完一个 passphrase 钱包，都会去检查一遍之前创建过的钱包，是否可以正常获取地址
        </Text>
        <Text>2.1 如果可以正常获取地址，测试个数 +1，继续创建下一个钱包</Text>
        <Text>2.2 如果获取失败需要重新输入 passphrase，测试结束</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Picker selectedValue={testChain} onValueChange={itemValue => setTestChain(itemValue)}>
            <Picker.Item label="BTC(Secp256k1)" value="btc" />
            <Picker.Item label="EVM(Secp256k1)" value="evm" />
            <Picker.Item label="DOT(ED25519)" value="dot" />
            <Picker.Item label="ADA" value="ada" />
          </Picker>
          <Button title="Begin Test" onPress={testSessionCount} />
          <View style={styles.resultItem}>
            <Text
              style={styles.item}
            >{`测试 ${passphraseStateList?.current?.length} 个 passphrase`}</Text>
            <Text style={styles.item}>{`${result}`}</Text>
            <Text style={styles.item}>{`测试结果 ${testSessionCountResult?.payload}`}</Text>
          </View>
        </View>
      </View>
    );
  }, [testSessionCountResult?.done, testSessionCountResult?.payload, testChain, testSessionCount]);

  return ContentView;
}
