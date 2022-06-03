import { useState, useEffect } from 'react';
import HardwareWebSdk from '@onekeyfe/hd-web-sdk';
import './App.css';

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

  const ethereumGetAddress = async () => {
    const res = await HardwareWebSdk.evmGetAddress({
      device: { ...currentDevice },
      path: "m/44'/60'/0'/0/0",
    });
    console.log('react evm get address response: ', res);
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

  const evmSignMessage = async () => {
    const res = await HardwareWebSdk.evmSignMessage({
      device: { ...currentDevice },
      path: "m/44'/60'/0'/0/0",
      messageHex: '0x68656c6c6f20776f726c64',
    });
    console.log('react evm sign message response: ', res);
  };

  const evmSignMessageEIP712 = async () => {
    const res = await HardwareWebSdk.evmSignMessageEIP712({
      device: { ...currentDevice },
      path: "m/44'/60'/0'/0/0",
      domainHash: '0xb9d8c78acf9b987311de6c7b45bb6a9c8e1bf361fa7fd3467a2163f994c79500',
      messageHash: '0xb9d8c78acf9b987311de6c7b45bb6a9c8e1bf361fa7fd3467a2163f994c79500',
    });
    console.log('react evm sign message response: ', res);
  };

  const evmGetPublicKey = async () => {
    const res = await HardwareWebSdk.evmGetPublicKey({
      device: { ...currentDevice },
      path: "m/44'/60'/0'/0/0",
    });
    console.log('react evm get public key response: ', res);
  };

  const evmSignTransaction = async () => {
    const res = await HardwareWebSdk.evmSignTransaction({
      device: { ...currentDevice },
      path: "m/44'/60'/0'/0/0",
      transaction: {
        to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
        value: '0xf4240',
        data: '0x01',
        chainId: 1,
        nonce: '0x00',
        gasLimit: '0x5208',
        gasPrice: '0xbebc200',
      },
    });
    console.log('react evm sign transaction response: ', res);
  };

  const evmSignTransactionEIP1559 = async () => {
    const res = await HardwareWebSdk.evmSignTransaction({
      device: { ...currentDevice },
      path: "m/44'/60'/0'/0/0",
      transaction: {
        to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
        value: '0xf4240',
        data: '0x01',
        chainId: 1,
        nonce: '0x00',
        gasLimit: '0x5208',
        maxFeePerGas: '0xbebc200',
        maxPriorityFeePerGas: '0xbebc200',
      },
    });
    console.log('react evm sign transaction response: ', res);
  };

  const evmVerifyMessage = async () => {
    const res = await HardwareWebSdk.evmVerifyMessage({
      device: { ...currentDevice },
      address: '0xdA0b608bdb1a4A154325C854607c68950b4F1a34',
      messageHex: '4578616d706c65206d657373616765', // 'Example message'
      signature:
        '11dc86c631ef5d9388c5e245501d571b864af1a717cbbb3ca1f6dacbf330742957242aa52b36bbe7bb46dce6ff0ead0548cc5a5ce76d0aaed166fd40cb3fc6e51c',
    });
    console.log('react evm sign transaction response: ', res);
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
        <button type="button" onClick={btcGetAddress}>
          btcGetAddress
        </button>{' '}
        <button type="button" onClick={ethereumGetAddress}>
          ethereumGetAddress
        </button>
        <button type="button" onClick={evmSignMessage}>
          evmSignMessage
        </button>
        <button type="button" onClick={evmSignMessageEIP712}>
          evmSignMessageEIP712
        </button>
        <button type="button" onClick={evmGetPublicKey}>
          evmGetPublicKey
        </button>
        <button type="button" onClick={evmSignTransaction}>
          evmSignTransaction
        </button>
        <button type="button" onClick={evmSignTransactionEIP1559}>
          evmSignTransactionEIP1559
        </button>
        <button type="button" onClick={evmVerifyMessage}>
          evmVerifyMessage
        </button>
      </div>
    </div>
  );
}

export default App;
