import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { invalidParameter, validateParams } from '../helpers/paramsValidator';
import { addHexPrefix, isHexString, stripHexPrefix } from '../helpers/hexUtils';

import type { SolanaSignOffChainMessage as HardwareSolSignOffChainMessage } from '@onekeyfe/hd-transport';

const SOLANA_PUBLIC_KEY_LENGTH = 32;
const SOLANA_APPLICATION_DOMAIN_LENGTH = 32;
const MAX_REQUIRED_SIGNERS = 10;

const normalizeRequiredSigners = (requiredSigners?: unknown[]): string[] | undefined => {
  if (!requiredSigners) return undefined;
  if (requiredSigners.length > MAX_REQUIRED_SIGNERS) {
    throw invalidParameter(
      `Parameter [requiredSigners] supports at most ${MAX_REQUIRED_SIGNERS} entries.`
    );
  }

  const normalized = requiredSigners.map((signer, index) => {
    if (
      typeof signer !== 'string' ||
      !isHexString(addHexPrefix(signer), SOLANA_PUBLIC_KEY_LENGTH)
    ) {
      throw invalidParameter(
        `Parameter [requiredSigners][${index}] must be a ${SOLANA_PUBLIC_KEY_LENGTH}-byte hex public key.`
      );
    }
    return stripHexPrefix(signer).toLowerCase();
  });

  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index - 1] >= normalized[index]) {
      throw invalidParameter('Parameter [requiredSigners] must be strictly sorted and unique.');
    }
  }

  return normalized;
};

export default class SolSignOffchainMessage extends BaseMethod<HardwareSolSignOffChainMessage> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'messageVersion', type: 'number', required: false },
      { name: 'messageFormat', type: 'number', required: false },
      { name: 'applicationDomainHex', type: 'hexString', required: false },
      { name: 'sourceFingerprint', type: 'number', required: false },
      { name: 'requiredSigners', type: 'array', required: false, allowEmpty: true },
    ]);

    const {
      path,
      messageHex,
      messageVersion,
      messageFormat,
      applicationDomainHex,
      sourceFingerprint,
      requiredSigners,
    } = this.payload;
    const addressN = validatePath(path, 3);
    if (
      sourceFingerprint !== undefined &&
      (!Number.isInteger(sourceFingerprint) ||
        sourceFingerprint < 0 ||
        sourceFingerprint > 0xffffffff)
    ) {
      throw invalidParameter('Parameter [sourceFingerprint] must be a uint32 number.');
    }
    if (
      applicationDomainHex !== undefined &&
      !isHexString(addHexPrefix(applicationDomainHex), SOLANA_APPLICATION_DOMAIN_LENGTH)
    ) {
      throw invalidParameter('Parameter [applicationDomainHex] must be 32 bytes.');
    }

    // init params
    this.params = {
      address_n: addressN,
      message: stripHexPrefix(messageHex),
      message_version: messageVersion ?? undefined,
      message_format: messageFormat ?? undefined,
      application_domain: applicationDomainHex ? stripHexPrefix(applicationDomainHex) : undefined,
      source_fingerprint: sourceFingerprint ?? undefined,
      required_signers: normalizeRequiredSigners(requiredSigners),
    };
  }

  getVersionRange() {
    return {
      model_pro2: {
        min: '0.0.0',
      },
      pro: {
        min: '4.12.0',
      },
      model_classic1s: {
        min: '3.11.0',
      },
    };
  }

  async run() {
    const response = await this.device.commands.typedCall(
      'SolanaSignOffChainMessage',
      'SolanaMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve({
      signature: response.message.signature,
      pub: response.message.public_key,
    });
  }
}
