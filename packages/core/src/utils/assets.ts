import { httpRequest as browserHttpRequest } from './networkUtils';

export const httpRequest = (url: string, type: string): any => browserHttpRequest(url, type);

export const getTimeStamp = () => new Date().getTime();
