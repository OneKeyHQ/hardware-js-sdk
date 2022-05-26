import { BaseMethod } from './BaseMethod';

export default class SearchDevices extends BaseMethod {
  init() {
    this.useDevice = false;
  }

  run() {
    return Promise.resolve([1, 2, 3, 4, 5]);
  }
}
