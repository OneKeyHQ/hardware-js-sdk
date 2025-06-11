import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "lightning",
  name: "Lightning",
  description: "Bitcoin Lightning Network operations",
  icon: ``,
  color: "#F7931A",
  category: "bitcoin" as ChainCategory,
};

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


// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
