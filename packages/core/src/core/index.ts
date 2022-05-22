import DataManager from '../data-manager/DataManager';
import { DeviceList } from '../device/DeviceList';
import { initLog } from '../utils';

const Log = initLog('Core');

let device: any;
export default class Core {
  deviceList?: DeviceList;

  // eslint-disable-next-line class-methods-use-this
  async initCore() {
    await DataManager.load({});
  }

  async initDeviceList() {
    this.deviceList = new DeviceList();
    await this.deviceList.getDeviceLists();
  }

  async initDevice(path?: string) {
    Log.debug('initDevice', path);
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

    if (device) {
      device.deviceConnector = this.deviceList?.connector;
    }

    // TODO: 获取 device 后测试连接部分逻辑
    const connectRes = await device?.connect();
    Log.debug('connect result: ', connectRes);
  }

  // eslint-disable-next-line class-methods-use-this
  async getFeatures() {
    Log.debug('Core getFeatures, ', device);
    await device?.getFeatures();
  }
}
