import type { UnifiedMethodConfig, ChainCategory } from '../types';

// 链元数据
export const chainMeta = {
  id: 'lightning',
  name: 'Lightning',
  description: 'Bitcoin Lightning Network operations',
  category: 'bitcoin' as ChainCategory,
};

const api: UnifiedMethodConfig[] = [
  {
    method: 'lnurlAuth',
    description: 'LNURL Auth',
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
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
