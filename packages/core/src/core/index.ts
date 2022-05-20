import DataManager from '../data-manager/DataManager';
import { DeviceList } from '../device/DeviceList';

export default class Core {
  deviceList?: DeviceList;

  async initCore() {
    await DataManager.load({});
    this.deviceList = new DeviceList();
  }

  async initDeviceList() {
    this.deviceList = new DeviceList();
    await this.deviceList.init();
    await this.deviceList.getDeviceLists();
  }

  async initDevice(path?: string) {
    let device;
    if (!this.deviceList) {
      await this.initDeviceList();
    }

    const _deviceList = this.deviceList?.allDevices();
    // 请求设备列表后，还是没有连接设备则不继续创建设备
    if (!_deviceList || !_deviceList.length) {
      return false;
    }

    if (path) {
      device = this.deviceList?.getDevice(path) ?? null;
    }

    if (_deviceList.length === 1) {
      [device] = _deviceList;
    } else if (_deviceList.length > 1) {
      throw new Error('设备列表中有多个设备，请先选择设备');
    }

    // TODO: 获取 device 后测试连接部分逻辑
  }
}
