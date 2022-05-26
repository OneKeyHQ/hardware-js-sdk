import { useState, useEffect } from 'react'
import HardwareWebSdk from '@onekeyfe/hd-web-sdk'
import './App.css';

let core

let loaded = false

function App() {
  console.log(HardwareWebSdk)
  const [devices, setDevices] = useState([])
  const [currentDevice, setCurrentDevice] = useState(null)
  const [initialize, setInitialize] = useState(false)

  const sdkInit = async () => {
    const settings = {
      debug: true,
      connectSrc: 'https://localhost:8088/',
    }
    HardwareWebSdk.init(settings)
  }

  useEffect(() => {
    if (!loaded) {
      sdkInit()
    }
    loaded = true
  }, []);

  const callAPI = async () => {
    const res = await HardwareWebSdk.call({method: 'getFeatures', params: {foo: 'bar'}})
    console.log('react call api response: ', res)
  }

  const usbConnect = () => {
    if (currentDevice) {
      core.initDevice(currentDevice.path)
    }
  }

  const getDevicesList = async () => {
   const res = await HardwareWebSdk.searchDevices()
   console.log('react searchDevices response: ', res)
   setDevices(res.payload ?? [])
  }

  const onGetFeatures = async () => {
    const res = await HardwareWebSdk.getFeatures({})
    console.log('react get features response: ', res)
  }

  return (
    <div className="App">
      <header>Connect Browser Example</header>
      <div>
        <button onClick={sdkInit}>SDK init</button>
        <button onClick={getDevicesList}>GetDeviceList</button>
        <button onClick={usbConnect}>Device Connect</button>
        <button onClick={onGetFeatures}>GetFeatures</button>
        <button onClick={callAPI}>CallAPI</button>
      </div>
      <div style={{textAlign: 'left', margin: '20px'}}>
        当前选取设备：{currentDevice ? JSON.stringify(currentDevice) : '无'}
      </div>
      <div style={{textAlign: 'left'}}>
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
