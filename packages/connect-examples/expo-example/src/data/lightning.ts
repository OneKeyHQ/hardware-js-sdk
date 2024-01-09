import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'lnurlAuth',
    description: 'LNURL Auth',
    presupposes: [
      {
        title: 'LNURL Auth',
        value: {
          domain: 'https://google.com',
          k1: 'k1',
        },
      },
    ],
  },
];

export default api;
