import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Button, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDevice } from '../../provider/DeviceProvider';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { TestChain, requestAddress, styles } from './utils';
import { CommonInput } from '../CommonInput';
import { SwitchInput } from '../SwitchInput';

export default function TestWalletChangeView() {
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const [includeNormal, setIncludeNormal] = useState<boolean>(true);
  const [testChain, setTestChain] = useState<TestChain>('btc');
  const [testWalletCount, setTestWalletCount] = useState(5);
  const [changeWalletCount, setChangeWalletCount] = useState(20);
  const [testResult, setTestResult] = useState<{
    done?: boolean;
    payload: string;
  }>();

  const passphraseStateList = useRef<
    {
      id: string;
      passphrase: string;
      passphraseState?: string;
      address?: string;
      emptyPassphraseState?: boolean;
    }[]
  >();
  const currentPassphrase = useRef<string>('');

  useEffect(() => {
    if (testResult?.done && !!SDK) {
      SDK.removeAllListeners(UI_EVENT);
    }
  }, [SDK, testResult?.done]);

  useEffect(() => {
    // for testWalletCount count
    passphraseStateList.current = [];
    Array.from({ length: testWalletCount }).forEach((_, index) => {
      if (index === 0 && includeNormal) {
        passphraseStateList.current?.push({
          id: `${index}`,
          passphrase: '',
          emptyPassphraseState: true,
        });
      } else {
        passphraseStateList.current?.push({
          id: `${index}`,
          passphrase: `${index}`,
        });
      }
    });
  }, [includeNormal, testWalletCount]);

  const beginTest = useCallback(async () => {
    // for passphraseStateList
    if (!SDK) return;
    SDK.removeAllListeners(UI_EVENT);

    setTestResult({
      done: false,
      payload: '测试中...',
    });

    const connectId = selectedDevice?.connectId ?? '';

    // refresh device
    const featuresRes = await SDK.getFeatures(connectId);
    // @ts-expect-error
    const deviceId = featuresRes.payload?.device_id ?? '';

    SDK.on(UI_EVENT, (message: CoreMessage) => {
      console.log('TopLEVEL EVENT ===>>>>: ', message);
      if (message.type === UI_REQUEST.REQUEST_PIN) {
        SDK.uiResponse({
          type: UI_RESPONSE.RECEIVE_PIN,
          payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
        });
      }
      if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
        setTimeout(() => {
          SDK.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: currentPassphrase.current,
            },
          });
        }, 200);
      }
    });

    const cacheAddress = new Map<
      string,
      {
        address: string;
        passphraseState?: string;
      }
    >();
    for (const item of passphraseStateList.current ?? []) {
      //   let passphraseState: string | undefined;
      currentPassphrase.current = item.passphrase;
      //   if (!item.emptyPassphraseState) {
      const passphraseStateRes = await SDK.getPassphraseState(connectId, {
        initSession: true,
        useEmptyPassphrase: item.emptyPassphraseState,
      });
      if (!passphraseStateRes.success) {
        setTestResult({
          done: true,
          payload: `getPassphraseState failed ${passphraseStateRes?.payload?.error}`,
        });
        return;
      }
      if (!item.emptyPassphraseState && !passphraseStateRes.payload) {
        setTestResult({
          done: true,
          payload: 'passphrase is not enabled on the device.',
        });
        return;
      }

      const passphraseState = passphraseStateRes.payload;
      //   }

      const addressRes = await requestAddress({
        sdk: SDK,
        testChain,
        connectId,
        deviceId,
        passphraseState,
        useEmptyPassphrase: item.emptyPassphraseState,
      });

      if (!addressRes.success) {
        setTestResult({
          done: true,
          payload: `GetAddress 失败 ${addressRes?.payload?.error}`,
        });
        return;
      }

      cacheAddress.set(item.id, {
        address: addressRes.payload.address ?? '',
        passphraseState,
      });
    }

    passphraseStateList.current = [
      ...(passphraseStateList.current ?? []).map(current => {
        const addressRes = cacheAddress.get(current.id);
        if (!addressRes) return current;
        return {
          ...current,
          address: addressRes?.address,
          passphraseState: addressRes?.passphraseState,
        };
      }),
    ];

    // for changeWalletCount count
    for (let index = 0; index < changeWalletCount; index++) {
      const item = passphraseStateList.current?.[index % (testWalletCount ?? 0)];
      if (!item) {
        setTestResult({
          done: true,
          payload: 'changeWalletCount error',
        });
        return;
      }

      currentPassphrase.current = item.passphrase;
      const addressRes = await requestAddress({
        sdk: SDK,
        testChain,
        connectId,
        deviceId,
        passphraseState: item.passphraseState,
        useEmptyPassphrase: item.emptyPassphraseState,
      });

      if (!addressRes.success) {
        setTestResult({
          done: true,
          payload: `id:${item.id} passphrase:${item.passphrase} ${testChain} GetAddress 失败 ${addressRes?.payload?.error}`,
        });
        return;
      }

      if (item.address !== addressRes.payload.address) {
        console.log('Test list:', passphraseStateList.current);
        setTestResult({
          done: true,
          payload: `id:${item.id} passphrase:${item.passphrase} ${testChain} GetAddress 结果不一致!!!!`,
        });
        return;
      }
    }

    setTestResult({
      done: true,
      payload: '测试结果正确',
    });
  }, [SDK, changeWalletCount, selectedDevice?.connectId, testChain, testWalletCount]);

  const ContentView = useMemo(() => {
    console.log();
    let result;
    if (testResult?.done === undefined) {
      result = '未测试';
    } else if (testResult?.done) {
      result = '完成';
    } else {
      result = '进行中';
    }

    return (
      <View style={styles.subContainer}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Passphrase Change Test</Text>
        <Text>开始之后根据提示解锁硬件, 根据硬件提示确认 passphrase, 不用自己输入</Text>
        <Text>测试步骤：1. 创建 N 个钱包，包含一个非 passphrase 钱包</Text>
        <Text>2. 获取这些钱包的 address</Text>
        <Text>
          3. 根据测试切换次数，从第一个钱包开始一直切换。会自动填写 passphrase，注意在硬件按确认
        </Text>
        <Text>
          Tips: 可以创建小数量的钱包，然后测试切换次数大一点，这样可以测试到不同的钱包之间切换
          可以创建大数量的钱包，测试缓存失效的情况
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <CommonInput
            type="number"
            label="钱包数量"
            value={testWalletCount.toString()}
            onChange={number => setTestWalletCount(parseInt(number))}
          />
          <CommonInput
            type="number"
            label="测试切换次数"
            value={changeWalletCount.toString()}
            onChange={number => setChangeWalletCount(parseInt(number))}
          />
          <SwitchInput label="包含普通钱包" value={!!includeNormal} onToggle={setIncludeNormal} />
          <Picker selectedValue={testChain} onValueChange={itemValue => setTestChain(itemValue)}>
            <Picker.Item label="BTC(Secp256k1)" value="btc" />
            <Picker.Item label="EVM(Secp256k1)" value="evm" />
            <Picker.Item label="DOT(ED25519)" value="dot" />
            <Picker.Item label="ADA" value="ada" />
          </Picker>
          <Button title="Begin Test" onPress={beginTest} />
          <View style={styles.resultItem}>
            <Text style={styles.item}>{`${result}`}</Text>
            <Text style={styles.item}>{`测试结果 ${testResult?.payload}`}</Text>
          </View>
          <View style={styles.fullItem}>
            <TextInput
              style={[styles.input, styles.responseInput]}
              value={JSON.stringify(passphraseStateList.current ?? [], null, 2)}
              placeholder="Response will be shown here."
              multiline
              editable={false}
            />
          </View>
        </View>
      </View>
    );
  }, [
    beginTest,
    changeWalletCount,
    includeNormal,
    testChain,
    testResult?.done,
    testResult?.payload,
    testWalletCount,
  ]);

  return ContentView;
}
