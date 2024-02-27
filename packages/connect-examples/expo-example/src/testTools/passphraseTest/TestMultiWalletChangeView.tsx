import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { Button, Text, TextInput, View } from 'react-native';
import { TestChain, requestAddress, styles } from './utils';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useDevice } from '../../provider/DeviceProvider';
import { CommonInput } from '../../components/CommonInput';

type TestPresupposeWallet = {
  id: string;
  passphrase: string;
  emptyPassphraseState?: boolean;
  addressList?: {
    index: number;
    chain: TestChain;
  }[];
};
type TestResult = {
  id: string;
  passphrase: string;
  passphraseState?: string;
  emptyPassphraseState?: boolean;
  addressList?: {
    index: number;
    chain: TestChain;
    address?: string;
  }[];
};
const testPresuppose: {
  normal: TestPresupposeWallet[];
  normalWithNormalWallet: TestPresupposeWallet[];
} = {
  normalWithNormalWallet: [
    {
      id: '0',
      passphrase: '',
      emptyPassphraseState: true,
      addressList: [
        {
          index: 0,
          chain: 'btc',
        },
        {
          index: 1,
          chain: 'evm',
        },
      ],
    },
    {
      id: '1',
      passphrase: '111',
      addressList: [
        {
          index: 0,
          chain: 'btc',
        },
        {
          index: 1,
          chain: 'evm',
        },
        {
          index: 2,
          chain: 'dot',
        },
        {
          index: 3,
          chain: 'ada',
        },
      ],
    },
    {
      id: '2',
      passphrase: '222',
      addressList: [
        {
          index: 0,
          chain: 'btc',
        },
        {
          index: 1,
          chain: 'dot',
        },
      ],
    },
    {
      id: '3',
      passphrase: '444',
      addressList: [
        {
          index: 0,
          chain: 'evm',
        },
        {
          index: 1,
          chain: 'ada',
        },
      ],
    },
  ],
  normal: [
    {
      id: '1',
      passphrase: '111',
      addressList: [
        {
          index: 0,
          chain: 'btc',
        },
        {
          index: 1,
          chain: 'evm',
        },
        {
          index: 2,
          chain: 'dot',
        },
        {
          index: 3,
          chain: 'ada',
        },
      ],
    },
    {
      id: '2',
      passphrase: '222',
      addressList: [
        {
          index: 0,
          chain: 'btc',
        },
        {
          index: 1,
          chain: 'dot',
        },
      ],
    },
    {
      id: '3',
      passphrase: '444',
      addressList: [
        {
          index: 0,
          chain: 'evm',
        },
        {
          index: 1,
          chain: 'ada',
        },
      ],
    },
  ],
};

export default function TestMultiWalletChangeView() {
  const { sdk: SDK } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();

  const [changeWalletCount, setChangeWalletCount] = useState(20);
  const [testResult, setTestResult] = useState<{
    done?: boolean;
    payload: string;
  }>();

  const [walletParams, setWalletParams] = useState<string>(
    JSON.stringify(testPresuppose.normalWithNormalWallet, null, 2)
  );
  const [walletResult, setWalletResult] = useState<TestResult[]>();
  const currentPassphrase = useRef<string>('');

  useEffect(() => {
    if (testResult?.done && !!SDK) {
      SDK.removeAllListeners(UI_EVENT);
    }
  }, [SDK, testResult?.done]);

  const setNormalWithNormalWalletTest = useCallback(() => {
    setWalletParams(JSON.stringify(testPresuppose.normalWithNormalWallet, null, 2));
  }, []);
  const setNormalTest = useCallback(() => {
    setWalletParams(JSON.stringify(testPresuppose.normal, null, 2));
  }, []);

  const beginTest = useCallback(async () => {
    const walletList: TestPresupposeWallet[] = JSON.parse(walletParams ?? '[]');

    const testWalletCount = walletList?.length ?? 0;
    if (testWalletCount < 2) {
      setTestResult({
        done: true,
        payload: '测试钱包数量至少为 2',
      });
      return;
    }

    if (!SDK) return;
    SDK.removeAllListeners(UI_EVENT);

    setTestResult({
      done: false,
      payload: '测试中...',
    });

    const connectId = selectedDevice?.connectId ?? '';
    // refresh device
    const featuresRes = await SDK.getFeatures(connectId);
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

    const cacheWallet = new Map<
      string,
      {
        passphraseState?: string;
        addressList?: Map<
          number,
          {
            address: string;
          }
        >;
      }
    >();

    for (const item of walletList ?? []) {
      let passphraseState: string | undefined;
      currentPassphrase.current = item.passphrase;
      if (!item.emptyPassphraseState) {
        const passphraseStateRes = await SDK.getPassphraseState(connectId, {});
        if (!passphraseStateRes.success) {
          setTestResult({
            done: true,
            payload: `getPassphraseState failed ${passphraseStateRes?.payload?.error}`,
          });
          return;
        }
        if (!passphraseStateRes.payload) {
          setTestResult({
            done: true,
            payload: 'passphrase is not enabled on the device.',
          });
          return;
        }

        passphraseState = passphraseStateRes.payload;
      }

      const cacheAddressList = new Map<
        number,
        {
          address: string;
        }
      >();
      for (const addressItem of item.addressList ?? []) {
        const addressRes = await requestAddress({
          sdk: SDK,
          testChain: addressItem.chain,
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

        cacheAddressList.set(addressItem.index, {
          address: addressRes.payload.address ?? '',
        });
      }

      cacheWallet.set(item.id, {
        passphraseState,
        addressList: cacheAddressList,
      });
    }

    const result: TestResult[] = [
      ...(walletList ?? []).map(current => {
        const walletRes = cacheWallet.get(current.id);
        if (!walletRes) return current;
        return {
          ...current,
          passphraseState: walletRes?.passphraseState,
          addressList: current.addressList?.map(addressItem => {
            const addressRes = walletRes?.addressList?.get(addressItem.index);
            if (!addressRes) return addressItem;
            return {
              ...addressItem,
              address: addressRes?.address,
            };
          }),
        };
      }),
    ];

    setWalletResult(result);

    // for changeWalletCount count
    for (let index = 0; index < changeWalletCount; index++) {
      const item = walletList?.[index % (testWalletCount ?? 0)];
      if (!item) {
        setTestResult({
          done: true,
          payload: 'changeWalletCount error',
        });
        return;
      }

      currentPassphrase.current = item.passphrase;
      for (const addressItem of item.addressList ?? []) {
        const passphraseState = result.find(current => current.id === item.id)?.passphraseState;
        const address = result
          .find(current => current.id === item.id)
          ?.addressList?.find(current => current.index === addressItem.index)?.address;

        const addressRes = await requestAddress({
          sdk: SDK,
          testChain: addressItem.chain,
          connectId,
          deviceId,
          passphraseState,
          useEmptyPassphrase: item.emptyPassphraseState,
        });

        if (!addressRes.success) {
          setTestResult({
            done: true,
            payload: `id:${item.id} index:${addressItem.index} ${addressItem.chain} GetAddress 失败 ${addressRes?.payload?.error}`,
          });
          return;
        }

        if (address !== addressRes.payload.address) {
          setTestResult({
            done: true,
            payload: `id:${item.id} index:${addressItem.index} ${addressItem.chain} GetAddress 结果不一致!!!!`,
          });
          return;
        }
      }
    }

    setTestResult({
      done: true,
      payload: '测试结果正确',
    });
  }, [SDK, changeWalletCount, selectedDevice?.connectId, walletParams]);

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
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Passphrase Multi Change Test</Text>
        <Text>开始之后根据提示解锁硬件, 根据硬件提示确认 passphrase, 不用自己输入</Text>
        <Text>测试步骤：1. 根据您填写的参数创建 N 个钱包</Text>
        <Text>2. 获取这些钱包多个网络的 address</Text>
        <Text>
          3. 根据测试切换次数，从第一个钱包开始一直切换。会自动填写 passphrase，注意在硬件按确认
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Button title="普测试通（带普通钱包）" onPress={setNormalWithNormalWalletTest} />
          <Button title="普测试通（纯 Passphrase 钱包）" onPress={setNormalTest} />
          <View style={styles.fullItem}>
            <TextInput
              style={[styles.input, styles.responseInput]}
              value={walletParams}
              onChange={e => {
                setWalletParams(e.nativeEvent.text);
              }}
              placeholder="Test wallet list"
              multiline
              editable
            />
          </View>
          <CommonInput
            type="number"
            label="测试切换次数"
            value={changeWalletCount.toString()}
            onChange={number => setChangeWalletCount(parseInt(number))}
          />
          <Button title="Begin Test" onPress={beginTest} />
          <View style={styles.resultItem}>
            <Text style={styles.item}>{`${result}`}</Text>
            <Text style={styles.item}>{`测试结果 ${testResult?.payload}`}</Text>
          </View>
          <View style={styles.fullItem}>
            <TextInput
              style={[styles.input, styles.responseInput]}
              value={JSON.stringify(walletResult, null, 2)}
              placeholder="Test Address Response"
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
    setNormalTest,
    setNormalWithNormalWalletTest,
    testResult?.done,
    testResult?.payload,
    walletParams,
    walletResult,
  ]);

  return ContentView;
}
