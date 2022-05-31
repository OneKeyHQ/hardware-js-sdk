import axios from 'axios';

export const httpRequest = async (url: string, type = 'text') => {
  const response = await axios.request({
    url,
    withCredentials: false,
  });
  if (+response.status === 200) {
    if (type === 'json') {
      return response.data;
    }
    if (type === 'binary') {
      return response.data.arrayBuffer();
    }
    return response.data;
  }
  throw new Error(`httpRequest error: ${url} ${response.statusText}`);
};
