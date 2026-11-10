import { ZcashAddressScope, ZcashAddressType } from '@onekeyfe/hd-transport';
import transparent from './fixtures/zcash-transparent.json';
import orchard from './fixtures/zcash-orchard.json';
import ironwood from './fixtures/zcash-ironwood.json';
import { prepareZcashSample } from '../utils/manualSigning/zcash';

import type {
  ZcashGetAddressParams,
  ZcashGetFullViewingKeyParams,
  ZcashSignPcztParams,
} from '@onekeyfe/hd-core';
import type { PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'zcashGetAddress',
    description: '获取 Zcash 地址；UFVK 通过 zcashGetFullViewingKey 单独导出。',
    presupposes: [
      ...[
        { title: 'Unified (Orchard + P2PKH)', addressType: ZcashAddressType.UNIFIED_ORCHARD_P2PKH },
        { title: 'Transparent P2PKH', addressType: ZcashAddressType.TRANSPARENT_P2PKH },
        { title: 'Unified (Orchard)', addressType: ZcashAddressType.UNIFIED_ORCHARD },
      ].map(({ title, addressType }) => ({
        title,
        value: {
          path: "m/32'/133'/0'",
          addressType,
          scope: ZcashAddressScope.EXTERNAL,
          diversifierIndex: 0,
          showOnOneKey: true,
          includeSeedFingerprint: false,
        } satisfies ZcashGetAddressParams,
      })),
      {
        title: '透明地址 + seed fingerprint',
        value: {
          path: "m/32'/133'/0'",
          addressType: ZcashAddressType.TRANSPARENT_P2PKH,
          scope: ZcashAddressScope.EXTERNAL,
          diversifierIndex: 0,
          showOnOneKey: true,
          includeSeedFingerprint: true,
        } satisfies ZcashGetAddressParams,
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
            { path: "m/32'/133'/0'", showOnOneKey: false },
            { path: "m/32'/133'/1'", showOnOneKey: false },
          ] satisfies ZcashGetAddressParams[],
        },
      },
    ],
  },
  {
    method: 'zcashGetFullViewingKey',
    description: '导出 Zcash 统一完整查看密钥（UFVK），需要在设备上确认。',
    presupposes: [
      {
        title: '单账户',
        value: { path: "m/32'/133'/0'" } satisfies ZcashGetFullViewingKeyParams,
      },
      {
        title: '批量账户',
        value: {
          bundle: [
            { path: "m/32'/133'/0'" },
            { path: "m/32'/133'/1'" },
          ] satisfies ZcashGetFullViewingKeyParams[],
        },
      },
    ],
  },
  {
    method: 'zcashSignPczt',
    description: '先选静态样例；透明交易可按当前钱包重绑定，屏蔽交易暂只提供静态测试。',
    presupposes: [
      {
        title: '透明交易（静态样例）',
        value: transparent satisfies ZcashSignPcztParams,
        prepareSample: call => prepareZcashSample(call, transparent),
      },
      {
        title: '固定 Orchard 屏蔽交易（异钱包拒签）',
        value: orchard satisfies ZcashSignPcztParams,
        prepareSample: null,
      },
      {
        title: '固定 Ironwood 屏蔽交易（异钱包拒签）',
        value: ironwood satisfies ZcashSignPcztParams,
        prepareSample: null,
      },
      {
        title: '错误格式（应拒绝）',
        value: { pczt: '00' } satisfies ZcashSignPcztParams,
        prepareSample: null,
      },
    ],
  },
];

export default api;
