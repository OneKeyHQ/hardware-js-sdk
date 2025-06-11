import { type PlaygroundProps } from "../components/Playground";
import type { ChainCategory } from "../types";

// 链元数据
export const chainMeta = {
  id: "algorand",
  name: "Algorand",
  description: "Algorand blockchain operations",
  icon: ``,
  color: "#000000",
  category: "algorand" as ChainCategory,
};

const api: PlaygroundProps[] = [
  {
    method: "algoGetAddress",
    description: "Get address",
    presupposes: [
      {
        title: "Get address",
        value: {
          path: "m/44'/283'/0'/0'/0'",
          showOnOneKey: false,
        },
      },
      {
        title: "Batch Get Address",
        value: {
          bundle: [
            {
              path: "m/44'/283'/0'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/283'/1'/0'/0'",
              showOnOneKey: false,
            },
            {
              path: "m/44'/283'/2'/0'/0'",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: "algoSignTransaction",
    description: "Sign transaction",
    presupposes: [
      {
        title: "Sign transaction",
        value: {
          path: "m/44'/283'/0'/0'/0'",
          rawTx:
            "545889a3616d74cd03e8a3666565cd03e8a26676ce0241b3aea367656eac6d61696e6e65742d76312e30a26768c420c061c4d8fc1dbdded2d7604be4568e3f6d041987ac37bde4b620b5ab39248adfa26c76ce0241b796a3726376c4202c8ff1f3e02a31dae356ac1f5c450113d76323153bbb867ff88a3f8c1a3ae7cda3736e64c4208974657d5aa8b02503725d444c0bee69daf0f66d9d7ad14e9cf6d495aafe3467a474797065a3706179",
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
