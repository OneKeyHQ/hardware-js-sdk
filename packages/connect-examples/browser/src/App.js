import { useState, useEffect } from 'react';
import HardwareWebSdk from '@onekeyfe/hd-web-sdk';
import './App.css';
import CallMethod from './CallMethod';

let loaded = false;

function App() {
  const [devices, setDevices] = useState([]);
  const [currentDevice, setCurrentDevice] = useState(null);

  const sdkInit = () => {
    const settings = {
      debug: true,
      connectSrc: 'https://localhost:8088/',
    };
    HardwareWebSdk.init(settings);
  };

  useEffect(() => {
    if (!loaded) {
      sdkInit();
    }
    loaded = true;
  }, []);

  const getDevicesList = async () => {
    const res = await HardwareWebSdk.searchDevices();
    console.log('react searchDevices response: ', res);
    setDevices(res.payload ?? []);
  };

  const onGetFeatures = async () => {
    const res = await HardwareWebSdk.getFeatures({ device: { ...currentDevice } });
    console.log('react get features response: ', res);
  };

  const onCheckFirmwareRelease = async () => {
    const res = await HardwareWebSdk.checkFirmwareRelease({ device: { ...currentDevice } });
    console.log('react get firmware response: ', res);
  };

  const onCheckBLEFirmwareRelease = async () => {
    const res = await HardwareWebSdk.checkBLEFirmwareRelease({ device: { ...currentDevice } });
    console.log('react get bluetooth firmware response: ', res);
  };

  const onCheckTransportRelease = async () => {
    const res = await HardwareWebSdk.checkTransportRelease();
    console.log('react get transport release response: ', res);
  };

  const btcGetAddress = async () => {
    // const bitcoins = coins.bitcoin;
    // for (let index = 0; index < bitcoins.length; index++) {
    //   const coin = bitcoins[index];
    //   console.log('react get coin address request: ', coin.name);
    //   const res = await HardwareWebSdk.btcGetAddress({
    //     device: { ...currentDevice },
    //     path: "m/44'/60'/0'/0/0",
    //     coin: coin.name,
    //   });
    //   if (res.success) {
    //     newCoins.bitcoin.push({
    //       name: coin.name,
    //       slip44: coin.slip44,
    //       segwit: coin.segwit,
    //       coin_label: coin.coin_label,
    //       coin_name: coin.coin_name,
    //       coin_shortcut: coin.coin_shortcut,
    //     });
    //   }
    //   console.log('react get address response: ', res);
    // }
    // console.log('react get address response: ', JSON.stringify(newCoins));

    const res = await HardwareWebSdk.btcGetAddress({
      device: { ...currentDevice },
      path: "m/44'/60'/0'/0/0",
      coin: 'btc',
    });
    console.log('react btc get address response: ', res);
  };

  return (
    <div className="App">
      <header>Connect Browser Example</header>
      <div>
        <button type="button" onClick={sdkInit}>
          SDK init
        </button>
        <button type="button" onClick={getDevicesList}>
          GetDeviceList
        </button>
        <button type="button" onClick={onGetFeatures}>
          GetFeatures
        </button>
        <button type="button" onClick={onCheckFirmwareRelease}>
          checkFirmwareRelease
        </button>
        <button type="button" onClick={onCheckBLEFirmwareRelease}>
          checkBLEFirmwareRelease
        </button>
        <button type="button" onClick={onCheckTransportRelease}>
          checkTransportRelease
        </button>
      </div>
      <div style={{ textAlign: 'left', margin: '20px' }}>
        当前选取设备：{currentDevice ? JSON.stringify(currentDevice) : '无'}
      </div>
      <div style={{ textAlign: 'left' }}>
        <p>设备列表</p>
        <ul>
          {devices.map(device => (
            <li key={device.path}>
              <span>{JSON.stringify(device)}</span>
              <button type="button" onClick={() => setCurrentDevice(device)}>
                select
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
        <h3>EVM Method Example</h3>
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
          <CallMethod
            title="evmGetAddress"
            option={[
              { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
              { name: 'showOnOneKey', value: false, type: 'checkbox' },
            ]}
            onCall={data =>
              HardwareWebSdk.evmGetAddress({
                device: { ...currentDevice },
                ...data,
              })
            }
          />

          <CallMethod
            title="evmGetPublicKey"
            option={[
              { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
              { name: 'showOnOneKey', value: false, type: 'checkbox' },
            ]}
            onCall={data =>
              HardwareWebSdk.evmGetPublicKey({
                device: { ...currentDevice },
                ...data,
              })
            }
          />

          <CallMethod
            title="evmSignMessage"
            option={[
              { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
              { name: 'messageHex', value: '0x68656c6c6f20776f726c64', type: 'string' },
            ]}
            onCall={data =>
              HardwareWebSdk.evmSignMessage({
                device: { ...currentDevice },
                ...data,
              })
            }
          />

          <CallMethod
            title="evmSignMessageEIP712"
            option={[
              { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
              {
                name: 'domainHash',
                value: '0xb9d8c78acf9b987311de6c7b45bb6a9c8e1bf361fa7fd3467a2163f994c79500',
                type: 'string',
              },
              {
                name: 'messageHash',
                value: '0xb9d8c78acf9b987311de6c7b45bb6a9c8e1bf361fa7fd3467a2163f994c79500',
                type: 'string',
              },
            ]}
            onCall={data =>
              HardwareWebSdk.evmSignMessageEIP712({
                device: { ...currentDevice },
                ...data,
              })
            }
          />

          <CallMethod
            title="evmSignTransaction"
            option={[
              { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
              {
                name: 'transaction.to',
                value: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
                type: 'string',
              },
              {
                name: 'transaction.value',
                value: '0xf4240',
                type: 'string',
              },
              {
                name: 'transaction.data',
                value: '0x01',
                type: 'string',
              },
              {
                name: 'transaction.chainId',
                value: 1,
                type: 'number',
              },
              {
                name: 'transaction.nonce',
                value: '0x00',
                type: 'string',
              },
              {
                name: 'transaction.gasLimit',
                value: '0x5208',
                type: 'string',
              },
              {
                name: 'transaction.gasPrice',
                value: '0xbebc200',
                type: 'string',
              },
            ]}
            onCall={data =>
              HardwareWebSdk.evmSignTransaction({
                device: { ...currentDevice },
                ...data,
              })
            }
          />

          <CallMethod
            title="evmSignTransactionEIP1559"
            option={[
              { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
              {
                name: 'transaction.to',
                value: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
                type: 'string',
              },
              {
                name: 'transaction.value',
                value: '0xf4240',
                type: 'string',
              },
              {
                name: 'transaction.data',
                value: '0x01',
                type: 'string',
              },
              {
                name: 'transaction.chainId',
                value: 1,
                type: 'number',
              },
              {
                name: 'transaction.nonce',
                value: '0x00',
                type: 'string',
              },
              {
                name: 'transaction.gasLimit',
                value: '0x5208',
                type: 'string',
              },
              {
                name: 'transaction.maxFeePerGas',
                value: '0xbebc200',
                type: 'string',
              },
              {
                name: 'transaction.maxPriorityFeePerGas',
                value: '0xbebc200',
                type: 'string',
              },
              {
                name: 'transaction.txType',
                value: undefined,
                type: 'number',
              },
            ]}
            onCall={data =>
              HardwareWebSdk.evmSignTransaction({
                device: { ...currentDevice },
                ...data,
              })
            }
          />

          <CallMethod
            title="evmVerifyMessage"
            option={[
              {
                name: 'address',
                value: '0xdA0b608bdb1a4A154325C854607c68950b4F1a34',
                type: 'string',
              },
              {
                name: 'messageHex',
                value: '4578616d706c65206d657373616765', // 'Example message'
                type: 'string',
              },
              {
                name: 'signature',
                value:
                  '11dc86c631ef5d9388c5e245501d571b864af1a717cbbb3ca1f6dacbf330742957242aa52b36bbe7bb46dce6ff0ead0548cc5a5ce76d0aaed166fd40cb3fc6e51c', // 'Example message'
                type: 'string',
              },
            ]}
            onCall={data =>
              HardwareWebSdk.evmVerifyMessage({
                device: { ...currentDevice },
                ...data,
              })
            }
          />
        </div>

        <h3>BTC Method Example</h3>
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'row' }}>
          <CallMethod
            title="btcGetAddress"
            option={[
              { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
              { name: 'coin', value: 'btc', type: 'string' },
              { name: 'showOnOneKey', value: false, type: 'checkbox' },
              { name: 'multisig', value: undefined, type: 'string' },
              { name: 'scriptType', value: undefined, type: 'string' },
            ]}
            onCall={data =>
              HardwareWebSdk.btcGetAddress({
                device: { ...currentDevice },
                ...data,
              })
            }
          />

          <CallMethod
            title="btcGetPublicKey"
            option={[
              { name: 'path', value: "m/44'/60'/0'/0/0", type: 'string' },
              { name: 'coin', value: 'btc', type: 'string' },
              { name: 'showOnOneKey', value: false, type: 'checkbox' },
              { name: 'scriptType', value: undefined, type: 'string' },
            ]}
            onCall={data =>
              HardwareWebSdk.btcGetPublicKey({
                device: { ...currentDevice },
                ...data,
              })
            }
          />

          <CallMethod
            title="btcSignMessage"
            option={[
              { name: 'path', value: "m/44'/0'/0'/0/0", type: 'string' },
              { name: 'coin', value: 'btc', type: 'string' },
              {
                name: 'messageHex',
                value: '4578616d706c65206d657373616765', // 'Example message'
                type: 'string',
              },
            ]}
            onCall={data =>
              HardwareWebSdk.btcSignMessage({
                device: { ...currentDevice },
                ...data,
              })
            }
          />

          <CallMethod
            title="btcVerifyMessage"
            option={[
              { name: 'address', value: '3BD8TL6iShVzizQzvo789SuynEKGpLTms9', type: 'string' },
              { name: 'coin', value: 'btc', type: 'string' },
              {
                name: 'messageHex',
                value: '0x6578616d706c65206d657373616765', // 'example message'
                type: 'string',
              },
              {
                name: 'signature',
                value:
                  '0x24eeef2f7b4e075a90c9f49e2152ef744c3d1b5b42bcbfa5363efc5c3015338b7a529b400ecde45c34cedbed9978438b14be3ffb09be041752a68de46f70a7b1ab',
                type: 'string',
              },
            ]}
            onCall={data =>
              HardwareWebSdk.btcVerifyMessage({
                device: { ...currentDevice },
                ...data,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

export default App;
