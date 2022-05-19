import './App.css';
import {  Device, DeviceList, DeviceConnector, Core  } from '@onekeyfe/hd-core'

function App() {

  const sdkInit = () => {
    Core.default.init()
  }

  const usbConnect = () => {
    console.log(Device)
  }

  const getDevicesList = () => {
    const deviceList = new DeviceList()
    console.log(deviceList)
  }

  const enumerate = () => {
    const connector = new DeviceConnector()
    connector.enumerate()
  }

  return (
    <div className="App">
      <header>Connect Browser Example</header>
      <button onClick={sdkInit}>SDK init</button>
      <button onClick={usbConnect}>USB Connect</button>
      <button onClick={getDevicesList}>GetDeviceList</button>
      <button onClick={enumerate}>Enumerate</button>
    </div>
  );
}

export default App;
