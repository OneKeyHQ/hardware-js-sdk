import { type PlaygroundProps } from "../components/Playground";

// 链元数据
export const chainMeta = {
  id: "xrp",
  name: "XRP",
  description: "XRP Ledger operations",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#23292F"/><path d="M8 8h8l-4 8-4-8z" fill="#00D4FF"/></svg>`,
  color: "#00D4FF",
  category: "xrp",
};

const api: PlaygroundProps[] = [
  {
    method: "xrpGetAddress",
    description: "Get address",
    presupposes: [
      {
        title: "Get address",
        value: {
          path: "m/44'/144'/0'/0/0",
          showOnOneKey: false,
        },
      },
      {
        title: "Batch Get Address",
        value: {
          bundle: [
            {
              path: "m/44'/144'/0'/0/0",
              showOnOneKey: false,
            },
            {
              path: "m/44'/144'/0'/0/1",
              showOnOneKey: false,
            },
            {
              path: "m/44'/144'/0'/0/2",
              showOnOneKey: false,
            },
          ],
        },
      },
    ],
  },
  {
    method: "xrpSignTransaction",
    description: "Sign Transaction",
    presupposes: [
      {
        title: "Sign Transaction",
        value: {
          path: "m/44'/144'/1'/0/0",
          transaction: {
            fee: "12",
            flags: 0,
            sequence: 32841006,
            maxLedgerVersion: 32841630,
            payment: {
              amount: 1000000,
              destination: "rwgumKP89VhMrJ4dRkGVS4tafRfAmZmKf8",
            },
          },
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
