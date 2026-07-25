import { httpRequest as browserHttpRequest } from './networkUtils';

import type { HttpRequestOptions } from './networkUtils';

export const httpRequest = (url: string, type: string, options?: HttpRequestOptions): any =>
  browserHttpRequest(url, type, options);

export const getTimeStamp = () => new Date().getTime();
