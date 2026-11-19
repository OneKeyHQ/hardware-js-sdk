import { createHash } from 'crypto';

import samples from './fixtures/zcash-qa.json';
import { zcashQaPresets } from './zcashQaPresets';

// Hashes and sizes are copied from the source QA manifest, never from a signed response.
describe('Zcash positive QA presets', () => {
  test('offers all 19 positive cases with no rejection scenarios', () => {
    expect(samples).toHaveLength(19);
    expect(new Set(samples.map(sample => sample.id)).size).toBe(19);
    expect(samples.some(sample => sample.id.startsWith('negative_'))).toBe(false);
    expect(samples[0].id).toBe('transparent_single');
    expect(zcashQaPresets.every(preset => preset.value.useEmptyPassphrase)).toBe(true);
  });

  test.each(samples.map(sample => [sample.id, sample] as const))(
    '%s preserves the original unsigned PCZT bytes',
    (_id, sample) => {
      expect(/^[0-9a-f]+$/.test(sample.pczt)).toBe(true);
      expect(sample.pczt.length % 2).toBe(0);
      const bytes = Buffer.from(sample.pczt, 'hex');
      expect(bytes.length).toBe(sample.decodedSize);
      expect(bytes.subarray(0, 4).toString()).toBe('PCZT');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(sample.decodedSha256);
    }
  );
});
