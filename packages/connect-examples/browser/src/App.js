import './App.css';
import {  Device, DeviceList  } from '@onekeyfe/hd-core'

function App() {
  const usbConnect = () => {
    console.log(Device)
  }

  const getDevicesList = () => {
    console.log(DeviceList)
  }

  return (
    <div className="App">
      <header>Connect Browser Example</header>
      <button onClick={usbConnect}>USB Connect</button>
      <button onClick={getDevicesList}>GetDeviceList</button>
    </div>
  );
}

export default App;
