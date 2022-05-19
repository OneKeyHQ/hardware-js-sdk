import { httpRequest as browserHttpRequest } from './networkUtils';
import coins from '../data/coins.json';
import bridgeReleases from '../data/bridge/releases.json';
import firmware1 from '../data/firmware/1/releases.json';
import firmware2 from '../data/firmware/2/releases.json';
import messages from '../data/messages/messages.json';

export const httpRequest = (url: string, _type: string): any => {
  const fileUrl = url.split('?')[0];

  // TODO: 调试原因，尚未创建 iframe, 先读取到内存中
  switch (fileUrl) {
    case './data/coins.json':
      return coins;
    case './data/bridge/releases.json':
      return bridgeReleases;
    case './data/firmware/1/releases.json':
      return firmware1;
    case './data/firmware/2/releases.json':
      return firmware2;
    case './data/messages/messages.json':
      return messages;
  }

  return browserHttpRequest(url);
};
