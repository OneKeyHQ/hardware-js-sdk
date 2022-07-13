import axios from 'axios';
import { BaseMethod } from './BaseMethod';

export default class CheckBridgeStatus extends BaseMethod {
  init() {
    this.useDevice = false;
  }

  async run() {
    return new Promise<boolean>(resolve => {
      axios
        .request({
          url: 'http://localhost:21320',
          method: 'POST',
          withCredentials: false,
        })
        .then(() => resolve(true))
        .catch(() => resolve(false));
    });
  }
}
