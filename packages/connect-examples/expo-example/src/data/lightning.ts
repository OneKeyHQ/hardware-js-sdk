import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'lnurlAuth',
    description: 'LNURL Auth',
    presupposes: [
      {
        title: 'LNURL Auth',
        value: {
          domain: 'site.com',
          k1: 'e2af6254a8df433264fa23f67eb8188635d15ce883e8fc020989d5f82ae6f11e',
        },
      },
    ],
  },
];

export default api;
