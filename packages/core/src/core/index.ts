import DataManager from '../data-manager/DataManager';
import { DeviceList } from '../device/DeviceList';

async function init() {
  await DataManager.load({});
  const deviceList = new DeviceList();
  await deviceList.init();
  await deviceList.getDeviceLists();
}

export default {
  init,
};
