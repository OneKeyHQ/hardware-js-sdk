import DataManager from '../data-manager/DataManager';
import { DeviceList } from '../device/DeviceList';

function init() {
  DataManager.load({});
  const deviceList = new DeviceList();
  deviceList.init();
}

export default {
  init,
};
