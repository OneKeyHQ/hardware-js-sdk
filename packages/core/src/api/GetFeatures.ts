import { BaseMethod } from './BaseMethod';

export default class GetFeatures extends BaseMethod {
  init() {}

  run() {
    return Promise.resolve(this.device.features);
  }
}
