import { ZcashAddressScope, ZcashAddressType } from '@onekeyfe/hd-transport';

import transparent from './fixtures/zcash-transparent.json';
import { zcashQaPresets, zcashQaRequirements } from './zcashQaPresets';
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
      ...[
        { title: 'Internal / index 1', scope: ZcashAddressScope.INTERNAL, diversifierIndex: 1 },
        { title: 'Account #2', path: "m/32'/133'/1'" },
        { title: 'Orchard / max uint32 index', diversifierIndex: 0xffffffff },
        { title: 'Address without display', showOnOneKey: false },
      ].map(({ title, ...params }) => ({
        title,
        value: {
          path: "m/32'/133'/0'",
          addressType: ZcashAddressType.UNIFIED_ORCHARD,
          showOnOneKey: true,
          ...params,
        } satisfies ZcashGetAddressParams,
      })),
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
    description: `透明静态样例可生成当前钱包测试数据。QA 预设：${zcashQaRequirements}`,
    presupposes: [
      {
        title: '透明交易（静态样例）',
        value: transparent satisfies ZcashSignPcztParams,
        prepareSample: call => prepareZcashSample(call, transparent),
      },
      ...zcashQaPresets.map(preset => ({
        title: preset.title,
        description: preset.description,
        value: preset.value,
        prepareSample: null,
      })),
    ],
  },
];

export default api;
