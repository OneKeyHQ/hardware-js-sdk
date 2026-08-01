import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'lnurlAuth',
    description: 'methodDescriptions.lnurlAuth',
    presets: [
      {
        title: 'LNURL Auth',
        parameters: [
          {
            name: 'domain',
            type: 'string',
            required: true,
            label: 'Domain',
            value: 'site.com',
          },
          {
            name: 'k1',
            type: 'string',
            required: true,
            label: 'K1',
            value: 'e2af6254a8df433264fa23f67eb8188635d15ce883e8fc020989d5f82ae6f11e',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const lightning: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'lightning',
  api,
};
