import { httpRequest as browserHttpRequest } from './networkUtils';

export const httpRequest = (url: string, _type: string): any => browserHttpRequest(url);
