export type PortfolioPackageSource = 'base64' | 'file' | 'example';

export type PortfolioPackageInfo = {
  bytes: Uint8Array;
  byteLength: number;
  prefixHex: string;
  source: PortfolioPackageSource;
};

const PORTFOLIO_PACKAGE_MAX_BYTES = 64 * 1024;
const PACKAGE_PREFIX_BYTES = 12;
const OKPP_MAGIC = [0x4f, 0x4b, 0x50, 0x50] as const;
const PFOL_MAGIC = [0x50, 0x46, 0x4f, 0x4c] as const;

function hasMagic(bytes: Uint8Array, offset: number, magic: readonly number[]) {
  return magic.every((value, index) => bytes[offset + index] === value);
}

export function decodePortfolioPackageBase64(value: string): Uint8Array {
  const normalized = value.replace(/\s+/g, '');
  if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new Error('Portfolio package Base64 is empty or malformed');
  }

  try {
    const binary = globalThis.atob(normalized);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    throw new Error('Portfolio package Base64 is empty or malformed');
  }
}

export function inspectPortfolioPackage(
  bytes: Uint8Array,
  source: PortfolioPackageSource
): PortfolioPackageInfo {
  if (bytes.byteLength < PACKAGE_PREFIX_BYTES) {
    throw new Error('Portfolio package is empty or shorter than its header');
  }
  if (bytes.byteLength > PORTFOLIO_PACKAGE_MAX_BYTES) {
    throw new Error('Portfolio package must not exceed 64 KiB');
  }
  if (!hasMagic(bytes, 0, OKPP_MAGIC)) {
    throw new Error('Portfolio package does not contain the OKPP container magic');
  }
  if (!hasMagic(bytes, 8, PFOL_MAGIC)) {
    throw new Error('Portfolio package does not contain the PFOL type magic');
  }

  return {
    bytes,
    byteLength: bytes.byteLength,
    prefixHex: Array.from(bytes.slice(0, PACKAGE_PREFIX_BYTES), byte =>
      byte.toString(16).padStart(2, '0')
    ).join(' '),
    source,
  };
}
