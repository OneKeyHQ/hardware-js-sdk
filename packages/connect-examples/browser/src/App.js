import { useState, useEffect } from 'react';
import HardwareWebSdk from '@onekeyfe/hd-web-sdk';
import './App.css';

let loaded = false;

function App() {
  console.log(HardwareWebSdk);
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

  return (
    <div className="App">
      <header>Connect Browser Example</header>
      <div>
        <button onClick={sdkInit}>SDK init</button>
        <button onClick={getDevicesList}>GetDeviceList</button>
        <button onClick={onGetFeatures}>GetFeatures</button>
        <button onClick={onCheckFirmwareRelease}>checkFirmwareRelease</button>
        <button onClick={onCheckBLEFirmwareRelease}>checkBLEFirmwareRelease</button>
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
              <button onClick={() => setCurrentDevice(device)}>select</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
