import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';
import secureJSON from 'secure-json-parse';

export type HttpRequestOptions = {
  body?: Array<any> | Record<string, unknown> | string;
  url: string;
  method: 'POST' | 'GET';
  timeout?: number;
};

function contentType(body: any) {
  if (typeof body === 'string') {
    return 'text/plain';
  }
  return 'application/json';
}

function wrapBody(body: any) {
  if (typeof body === 'string') {
    return body;
  }
  return JSON.stringify(body);
}

function parseResult(text: string) {
  try {
    const result = secureJSON.parse(text);
    if (typeof result !== 'object') {
      throw new Error('Invalid response');
    }
    return result;
  } catch (e) {
    return text;
  }
}

export async function request(options: HttpRequestOptions) {
  const fetchOptions: AxiosRequestConfig = {
    url: options.url,
    method: options.method,
    data: wrapBody(options.body),
    withCredentials: false,
    headers: {
      'Content-Type': contentType(options.body == null ? '' : options.body),
    },
    timeout: options.timeout ?? undefined,
    // Prevent string from converting to number
    // see https://stackoverflow.com/questions/43787712/axios-how-to-deal-with-big-integers
    transformResponse: data => data,
  };

  const res = await axios.request(fetchOptions);

  if (+res.status === 200) {
    return parseResult(res.data);
  }
  const resJson = parseResult(res.data);
  if (typeof resJson === 'object' && resJson != null && resJson.error != null) {
    throw new HardwareError({
      errorCode: HardwareErrorCode.NetworkError,
      message: resJson.error,
    });
  } else {
    throw new HardwareError({ errorCode: HardwareErrorCode.NetworkError, message: res.data });
  }
}

axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    return config;
  }
  // node environment
  if (config.url?.startsWith('http://localhost:21320')) {
    if (!config.headers.get('Origin')) {
      console.log('set node request origin');
      // add Origin field for request headers
      config.headers.set('Origin', 'https://jssdk.onekey.so');
    }
  }
  return config;
});
