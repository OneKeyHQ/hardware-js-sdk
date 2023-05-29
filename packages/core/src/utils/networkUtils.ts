import axios from 'axios';

export const httpRequest = async (url: string, type = 'text') => {
  const headers: any = {};
  if (url.indexOf('ngrok-free.app') > -1) {
    headers['ngrok-skip-browser-warning'] = true;
  }
  const response = await axios.request({
    url,
    withCredentials: false,
    responseType: type === 'binary' ? 'arraybuffer' : 'json',
    headers,
  });

  if (+response.status === 200) {
    if (type === 'json') {
      return response.data;
    }
    if (type === 'binary') {
      return response.data;
    }
    return response.data;
  }
  throw new Error(`httpRequest error: ${url} ${response.statusText}`);
};
