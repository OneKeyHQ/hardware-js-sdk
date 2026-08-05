import type { MultisigTestCase } from './types';

export const MULTISIG_STORAGE_KEY = 'onekey.multisig-test-cases';

type StoredMultisigCases = {
  version: 1;
  cases: MultisigTestCase[];
};

function isCustomCase(value: unknown): value is MultisigTestCase {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<MultisigTestCase>;
  return (
    item.builtIn === false &&
    item.source === 'custom' &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    (item.chain === 'eth' || item.chain === 'btc') &&
    typeof item.method === 'string' &&
    !!item.parameters &&
    typeof item.parameters === 'object'
  );
}

export function loadCustomCases(storage: Pick<Storage, 'getItem'>): MultisigTestCase[] {
  try {
    const value = storage.getItem(MULTISIG_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as Partial<StoredMultisigCases>;
    if (parsed.version !== 1 || !Array.isArray(parsed.cases)) return [];
    return parsed.cases.filter(isCustomCase);
  } catch {
    return [];
  }
}

export function saveCustomCases(
  storage: Pick<Storage, 'setItem'>,
  cases: MultisigTestCase[]
): void {
  const payload: StoredMultisigCases = {
    version: 1,
    cases: cases.filter(isCustomCase),
  };
  storage.setItem(MULTISIG_STORAGE_KEY, JSON.stringify(payload));
}
