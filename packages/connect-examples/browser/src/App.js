import { useState } from 'react'
import HardwareWebSdk from '@onekeyfe/hd-web-sdk'
import './App.css';

let core

function App() {
  const [devices, setDevices] = useState([])
  const [currentDevice, setCurrentDevice] = useState(null)
  const [initialize, setInitialize] = useState(false)
  console.log(HardwareWebSdk)

  const sdkInit = async () => {
    HardwareWebSdk.init({
      iframeSrc: 'https://localhost:8088/iframe.html',
    })
  }

  const usbConnect = () => {
    if (currentDevice) {
      core.initDevice(currentDevice.path)
    }
  }

  const getDevicesList = async () => {
    if (!initialize) {
      alert('请先操作 SDK 初始化')
      return
    }
    // const deviceList = new DeviceList()
    // const devices = await deviceList.getDeviceLists()
    // setDevices(devices)
  }

  const onGetFeatures = () => {
    core.getFeatures()
  }

  return (
    <div className="App">
      <header>Connect Browser Example</header>
      <div>
        <button onClick={sdkInit}>SDK init</button>
        <button onClick={getDevicesList}>GetDeviceList</button>
        <button onClick={usbConnect}>Device Connect</button>
        <button onClick={onGetFeatures}>GetFeatures</button>
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
