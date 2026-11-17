import samples from './fixtures/zcash-qa.json';

import type { ZcashSignPcztParams } from '@onekeyfe/hd-core';

export const zcashQaRequirements =
  '20261117 公开 QA 测试钱包，空 passphrase（见原测试包 README）；Pro2/Neo Protocol V2，固件 >= 1.0.4。合成交易不可广播，匹配测试钱包后预期签名成功。';

export const zcashQaPresets = samples.map(sample => ({
  title: `QA · ${sample.id}`,
  description: `${zcashQaRequirements} ${sample.description}。${sample.review}。`,
  value: { pczt: sample.pczt, useEmptyPassphrase: true } satisfies ZcashSignPcztParams & {
    useEmptyPassphrase: boolean;
  },
}));
