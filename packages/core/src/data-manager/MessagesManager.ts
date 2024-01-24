/* eslint-disable global-require, @typescript-eslint/no-var-requires */
import { MessageVersion } from './DataManager';
import CommonMessageJSON from '../data/messages/messages_common.json';
import { IDeviceType } from '../types';

const messages: {
  [deviceType in IDeviceType]: { [version in MessageVersion]: string };
} = {
  classic: {
    latest: '../data/messages/classic/messages.json',
    v1: '../data/messages/messages_legacy_v1.json',
  },
  classic1s: {
    latest: '../data/messages/classic1s/messages.json',
    v1: '../data/messages/messages_legacy_v1.json',
  },
  mini: {
    latest: '../data/messages/mini/messages.json',
    v1: '../data/messages/messages_legacy_v1.json',
  },
  touch: {
    latest: '../data/messages/touch/messages.json',
    v1: '../data/messages/messages_legacy_v1.json',
  },
  pro: {
    latest: '../data/messages/pro/messages.json',
    v1: '../data/messages/messages_legacy_v1.json',
  },
};

export function getCommonMessages() {
  return CommonMessageJSON as unknown as JSON;
}

export function getMessages(device: IDeviceType, version: MessageVersion) {
  // eslint-disable-next-line import/no-dynamic-require
  return require(messages[device][version]) as unknown as JSON;
}
