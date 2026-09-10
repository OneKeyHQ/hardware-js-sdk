import { bytesToHex, hexToBytes } from './hex';

const SOLANA_OFFCHAIN_SIGNING_DOMAIN = Uint8Array.of(
  0xff,
  ...Array.from('solana offchain', character => character.charCodeAt(0))
);
const SOLANA_PUBLIC_KEY_LENGTH = 32;
const MAX_SOLANA_OFFCHAIN_SIGNERS = 255;

export interface PrepareSolanaOffchainMessageV1Params {
  message: Uint8Array;
  requiredSigners: readonly string[];
}

export interface PreparedSolanaOffchainMessageV1 {
  messageText: string;
  requiredSigners: string[];
  serializedMessage: Uint8Array;
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  for (let index = 0; index < a.length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return a.length - b.length;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function decodeUtf8Strict(bytes: Uint8Array): string {
  let encoded = '';
  for (const value of bytes) {
    encoded += `%${value.toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(encoded);
}

export function prepareSolanaOffchainMessageV1({
  message,
  requiredSigners,
}: PrepareSolanaOffchainMessageV1Params): PreparedSolanaOffchainMessageV1 {
  if (message.length === 0) {
    throw new Error('Solana off-chain message cannot be empty');
  }
  if (requiredSigners.length === 0 || requiredSigners.length > MAX_SOLANA_OFFCHAIN_SIGNERS) {
    throw new Error('Solana off-chain message requires between 1 and 255 signers');
  }

  let messageText: string;
  try {
    messageText = decodeUtf8Strict(message);
  } catch {
    throw new Error('Solana off-chain message must contain valid UTF-8');
  }

  const signerBytes = requiredSigners.map((signer, index) => {
    let bytes: Uint8Array;
    try {
      bytes = hexToBytes(signer);
    } catch {
      throw new Error(`Solana off-chain signer ${index} must be a hex public key`);
    }
    if (bytes.length !== SOLANA_PUBLIC_KEY_LENGTH) {
      throw new Error(`Solana off-chain signer ${index} must be 32 bytes`);
    }
    return bytes;
  });
  signerBytes.sort(compareBytes);
  for (let index = 1; index < signerBytes.length; index += 1) {
    if (bytesEqual(signerBytes[index - 1], signerBytes[index])) {
      throw new Error('Solana off-chain signers must be unique');
    }
  }

  const serializedMessage = new Uint8Array(
    SOLANA_OFFCHAIN_SIGNING_DOMAIN.length +
      2 +
      signerBytes.length * SOLANA_PUBLIC_KEY_LENGTH +
      message.length
  );
  let offset = 0;
  serializedMessage.set(SOLANA_OFFCHAIN_SIGNING_DOMAIN, offset);
  offset += SOLANA_OFFCHAIN_SIGNING_DOMAIN.length;
  serializedMessage[offset] = 1;
  offset += 1;
  serializedMessage[offset] = signerBytes.length;
  offset += 1;
  for (const signer of signerBytes) {
    serializedMessage.set(signer, offset);
    offset += SOLANA_PUBLIC_KEY_LENGTH;
  }
  serializedMessage.set(message, offset);

  return {
    messageText,
    requiredSigners: signerBytes.map(bytesToHex),
    serializedMessage,
  };
}
