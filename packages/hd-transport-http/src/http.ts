import axios, { AxiosRequestConfig } from 'axios';

export type HttpRequestOptions = {
  body?: Array<any> | Record<string, unknown> | string;
  url: string;
  method: 'POST' | 'GET';
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
    return JSON.parse(text);
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
  };

  const res = await axios.request(fetchOptions);

  if (+res.status === 200) {
    return parseResult(res.data);
  }
  const resJson = parseResult(res.data);
  if (typeof resJson === 'object' && resJson != null && resJson.error != null) {
    throw new Error(resJson.error);
  } else {
    throw new Error(res.data);
  }
}
