import { bytesToHex, hexToBytes, prepareSolanaOffchainMessageV1 } from '@onekeyfe/hwk-adapter-core';

import {
  type TrezorChainContext,
  assertHexString,
  createInvalidParamsError,
  createMethodNotSupportedError,
  parseBip32Path,
  readString,
} from './utils';

import type {
  SolAddress,
  SolGetAddressParams,
  SolSignMsgParams,
  SolSignTxParams,
  SolSignature,
  SolSignedTx,
} from '@onekeyfe/hwk-adapter-core';

export async function solGetAddress(ctx: TrezorChainContext, params: unknown): Promise<SolAddress> {
  const request = readSolGetAddressParams(params);
  const response = await ctx.deviceSession.call('SolanaGetAddress', {
    address_n: parseBip32Path(request.path),
    show_display: request.showOnDevice ?? false,
  });

  if (response.type !== 'SolanaAddress') {
    throw new Error(`Expected SolanaAddress response, received ${response.type}`);
  }

  const address = readString(response.message, 'address');
  if (!address) {
    throw new Error('SolanaAddress response did not include an address');
  }

  return { address, path: request.path };
}

export async function solSignTransaction(
  ctx: TrezorChainContext,
  params: unknown
): Promise<SolSignedTx> {
  const request = readSolSignTxParams(params);
  const data: Record<string, unknown> = {
    address_n: parseBip32Path(request.path),
    serialized_tx: stripHexPrefix(request.serializedTx),
  };
  if (request.additionalInfo?.tokenAccountsInfos?.length || request.additionalInfo?.encodedToken) {
    data.additional_info = {
      token_accounts_infos:
        request.additionalInfo.tokenAccountsInfos?.map(info => ({
          base_address: info.baseAddress,
          token_program: info.tokenProgram,
          token_mint: info.tokenMint,
          token_account: info.tokenAccount,
        })) ?? [],
    };
    // Token definitions are caller-injected only — the SDK never fetches them
    // from the network. When omitted, the device falls back to a generic token
    // confirmation screen; callers who want the rich display pass encodedToken.
    if (request.additionalInfo.encodedToken) {
      (data.additional_info as Record<string, unknown>).encoded_token = hexToArrayBuffer(
        request.additionalInfo.encodedToken
      );
    }
  }

  const response = await ctx.deviceSession.call('SolanaSignTx', data);
  if (response.type !== 'SolanaTxSignature') {
    throw new Error(`Expected SolanaTxSignature response, received ${response.type}`);
  }

  const signature = readString(response.message, 'signature');
  if (!signature) {
    throw new Error('SolanaTxSignature response did not include a signature');
  }

  return { signature };
}

export async function solSignMessage(
  ctx: TrezorChainContext,
  params: unknown
): Promise<SolSignature> {
  const request = readSolSignMsgParams(params);
  if (request.messageVersion !== 1) {
    throw createMethodNotSupportedError(
      'Trezor supports finalized Solana off-chain message version 1 only'
    );
  }

  const preparedMessage = prepareSolanaOffchainMessageV1({
    message: hexToBytes(request.message),
    requiredSigners: request.requiredSigners,
  });
  const response = await ctx.deviceSession.call('SolanaSignMessage', {
    address_n: parseBip32Path(request.path),
    message: {
      message: preparedMessage.messageText,
      signers: preparedMessage.requiredSigners,
    },
  });
  if (response.type !== 'SolanaMessageSignature') {
    throw new Error(`Expected SolanaMessageSignature response, received ${response.type}`);
  }

  const signature = readString(response.message, 'signature');
  if (!signature) {
    throw new Error('SolanaMessageSignature response did not include a signature');
  }
  const signedData = readString(response.message, 'signed_data');
  const expectedSignedData = bytesToHex(preparedMessage.serializedMessage);
  if (!signedData || stripHexPrefix(signedData).toLowerCase() !== expectedSignedData) {
    throw new Error('Trezor signed data does not match the requested Solana off-chain message');
  }

  return { signature: stripHexPrefix(signature).toLowerCase() };
}

function readSolGetAddressParams(params: unknown): SolGetAddressParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('solGetAddress params must be an object');
  }
  const { path } = params as { path?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('solGetAddress requires a non-empty path');
  }
  const { showOnDevice } = params as { showOnDevice?: unknown };
  if (showOnDevice !== undefined && typeof showOnDevice !== 'boolean') {
    throw createInvalidParamsError('solGetAddress showOnDevice must be a boolean when provided');
  }
  return { path, showOnDevice };
}

function readSolSignTxParams(params: unknown): SolSignTxParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('solSignTransaction params must be an object');
  }
  const { path } = params as { path?: unknown };
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw createInvalidParamsError('solSignTransaction requires a non-empty path');
  }
  const { serializedTx } = params as { serializedTx?: unknown };
  if (typeof serializedTx !== 'string' || serializedTx.length === 0) {
    throw createInvalidParamsError('solSignTransaction requires serializedTx as a hex string');
  }
  assertHexString('serializedTx', serializedTx);
  return params as SolSignTxParams;
}

function readSolSignMsgParams(params: unknown): SolSignMsgParams {
  if (!params || typeof params !== 'object') {
    throw createInvalidParamsError('solSignMessage params must be an object');
  }
  const request = params as Partial<SolSignMsgParams>;
  if (typeof request.path !== 'string' || request.path.trim().length === 0) {
    throw createInvalidParamsError('solSignMessage requires a non-empty path');
  }
  if (typeof request.message !== 'string' || request.message.length === 0) {
    throw createInvalidParamsError('solSignMessage requires message as a hex string');
  }
  assertHexString('message', request.message);
  if (request.messageVersion === 1 && !Array.isArray(request.requiredSigners)) {
    throw createInvalidParamsError(
      'Solana off-chain message version 1 requires signer public keys'
    );
  }
  return request as SolSignMsgParams;
}

function stripHexPrefix(value: string): string {
  return value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
}

function hexToArrayBuffer(value: string): ArrayBuffer {
  const bytes = Buffer.from(stripHexPrefix(value), 'hex');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
