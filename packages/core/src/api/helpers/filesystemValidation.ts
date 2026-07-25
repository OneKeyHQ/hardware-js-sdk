import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

export const invalidParameter = (message: string) =>
  ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, message);

export function validateNonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidParameter(`Parameter [${name}] is required and must be a non-empty string.`);
  }
  return value;
}

const PROTOCOL_V2_FILESYSTEM_VOLUMES = new Set(['vol0', 'vol1']);
// Bootloader and romloader reserve 128 bytes including the terminating NUL.
const MAX_PROTOCOL_V2_FILESYSTEM_PATH_BYTES = 127;

function getUtf8ByteLength(value: string) {
  return Array.from(value).reduce((length, character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) return length + 1;
    if (codePoint <= 0x7ff) return length + 2;
    if (codePoint <= 0xffff) return length + 3;
    return length + 4;
  }, 0);
}

export function validateProtocolV2FilesystemPath(
  value: unknown,
  name: string,
  options: { allowVolumeRoot?: boolean } = {}
): string {
  const rawPath = validateNonEmptyString(value, name).trim();
  const containsUnsupportedCharacter = Array.from(rawPath).some(character => {
    const codePoint = character.charCodeAt(0);
    return codePoint <= 0x1f || codePoint === 0x7f || character === '\\';
  });

  if (containsUnsupportedCharacter) {
    throw invalidParameter(`Parameter [${name}] contains unsupported path characters.`);
  }

  const match = /^([a-zA-Z0-9]+):(.*)$/.exec(rawPath);
  if (!match) {
    throw invalidParameter(
      `Parameter [${name}] must use a supported Protocol V2 filesystem volume.`
    );
  }

  const volume = match[1].toLowerCase();
  if (!PROTOCOL_V2_FILESYSTEM_VOLUMES.has(volume)) {
    throw invalidParameter(`Parameter [${name}] uses an unsupported filesystem volume.`);
  }

  const rawSuffix = match[2];
  if (rawSuffix.length === 0) {
    if (options.allowVolumeRoot) return `${volume}:`;
    throw invalidParameter(`Parameter [${name}] must identify a filesystem entry.`);
  }

  const suffix = rawSuffix.startsWith('/') ? rawSuffix : `/${rawSuffix}`;
  const segments = suffix.slice(1).split('/');
  if (segments.some(segment => segment.length === 0 || segment === '.' || segment === '..')) {
    throw invalidParameter(`Parameter [${name}] contains an invalid path segment.`);
  }

  const canonicalPath = `${volume}:${rawSuffix.startsWith('/') ? '/' : ''}${segments.join('/')}`;
  if (getUtf8ByteLength(canonicalPath) > MAX_PROTOCOL_V2_FILESYSTEM_PATH_BYTES) {
    throw invalidParameter(`Parameter [${name}] exceeds the maximum filesystem path length.`);
  }

  return canonicalPath;
}

export function validateNonNegativeInteger(
  value: unknown,
  name: string,
  defaultValue?: number
): number {
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) return defaultValue;
    throw invalidParameter(`Missing required parameter: ${name}`);
  }

  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof numeric !== 'number' || !Number.isSafeInteger(numeric) || numeric < 0) {
    throw invalidParameter(`Parameter [${name}] must be a non-negative integer.`);
  }
  return numeric;
}

export function validateOptionalNonNegativeInteger(
  value: unknown,
  name: string
): number | undefined {
  if (value === undefined || value === null) return undefined;
  return validateNonNegativeInteger(value, name);
}

export function validateOptionalPercentage(value: unknown, name: string): number | undefined {
  const numeric = validateOptionalNonNegativeInteger(value, name);
  if (numeric === undefined) return undefined;
  if (numeric > 100) {
    throw invalidParameter(`Parameter [${name}] must be between 0 and 100.`);
  }
  return numeric;
}

export function validateRequiredData(value: unknown, name: string): void {
  if (value === undefined || value === null) {
    throw invalidParameter(`Missing required parameter: ${name}`);
  }
}
