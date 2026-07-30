const BLUETOOTH_BASE_UUID_SUFFIX = '00001000800000805f9b34fb';

export const normalizeBleUuid = (uuid?: string | null) =>
  (uuid ?? '').replace(/-/g, '').toLowerCase();

export const createKnownBleUuidAliases = (uuid: string): ReadonlySet<string> => {
  const normalized = normalizeBleUuid(uuid);
  const aliases = new Set([normalized]);

  if (normalized.length !== 32 || !normalized.endsWith(BLUETOOTH_BASE_UUID_SUFFIX)) {
    return aliases;
  }

  const assignedNumber = normalized.slice(0, 8);
  aliases.add(assignedNumber);

  if (assignedNumber.startsWith('0000')) {
    aliases.add(assignedNumber.slice(4));
  }

  return aliases;
};

export const matchesKnownBleUuid = (
  actualUuid: string | null | undefined,
  aliases: ReadonlySet<string>
) => aliases.has(normalizeBleUuid(actualUuid));
