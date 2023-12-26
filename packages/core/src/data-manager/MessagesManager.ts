/* eslint-disable global-require, @typescript-eslint/no-var-requires */
import { MessageVersion } from './DataManager';
import CommonMessageJSON from '../data/messages/messages_common.json';
import { IDeviceType } from '../types';

import LegacyMessageJSON from '../data/messages/messages_legacy_v1.json';
import ClassicMessageJSON from '../data/messages/classic/messages.json';
import Classic1sMessageJSON from '../data/messages/classic1s/messages.json';
import MiniMessageJSON from '../data/messages/mini/messages.json';
import TouchMessageJSON from '../data/messages/touch/messages.json';
import ProMessageJSON from '../data/messages/pro/messages.json';

const messages: {
  [deviceType in IDeviceType]: { [version in MessageVersion]: JSON };
} = {
  classic: {
    latest: ClassicMessageJSON as unknown as JSON,
    v1: LegacyMessageJSON as unknown as JSON,
  },
  classic1s: {
    latest: Classic1sMessageJSON as unknown as JSON,
    v1: LegacyMessageJSON as unknown as JSON,
  },
  mini: {
    latest: MiniMessageJSON as unknown as JSON,
    v1: LegacyMessageJSON as unknown as JSON,
  },
  touch: {
    latest: TouchMessageJSON as unknown as JSON,
    v1: LegacyMessageJSON as unknown as JSON,
  },
  pro: {
    latest: ProMessageJSON as unknown as JSON,
    v1: LegacyMessageJSON as unknown as JSON,
  },
};

export function getCommonMessages() {
  return CommonMessageJSON as unknown as JSON;
}

export function getMessages(device: IDeviceType, version: MessageVersion) {
  // eslint-disable-next-line import/no-dynamic-require
  // return require(messages[device][version]) as unknown as JSON;
  return messages[device][version];
}
