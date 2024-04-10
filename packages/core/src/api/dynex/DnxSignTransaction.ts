import type { DnxSignTx, TypedCall } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

import type { DnxSignature } from '../../types';
import { TypedResponseMessage } from '../../device/DeviceCommands';
import { stripHexPrefix } from '../helpers/hexUtils';

export default class DnxSignTransaction extends BaseMethod<DnxSignTx> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const { payload } = this;
    // init params
    const addressN = validatePath(payload.path, 3);

    validateParams(payload, [
      { name: 'path', required: true },
      { name: 'inputs', type: 'array', required: true },
      { name: 'toAddress', type: 'string', required: true },
      { name: 'amount', required: true },
      { name: 'fee', required: true },
      { name: 'paymentIdHex', type: 'string' },
    ]);

    if (payload.paymentIdHex && stripHexPrefix(payload.paymentIdHex).length !== 64) {
      throw new Error('Payment ID must be 32 bytes long');
    }

    this.params = {
      address_n: addressN,
      inputs_count: payload.inputs.length,
      to_address: payload.toAddress,
      amount: payload.amount,
      fee: payload.fee,
    };
    if (payload.paymentIdHex) {
      this.params.payment_id = stripHexPrefix(payload.paymentIdHex);
    }
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.7.0',
      },
      model_touch: {
        min: '4.9.0',
      },
    };
  }

  async processTxRequest(
    typedCall: TypedCall,
    res: TypedResponseMessage<'DnxInputRequest'>,
    signature: Partial<DnxSignature>
  ): Promise<DnxSignature> {
    if (res.type === 'DnxInputRequest') {
      const { inputs } = this.payload;
      const { request_index, tx_key, computed_key_image } = res.message;

      if (tx_key?.ephemeral_tx_sec_key && tx_key?.ephemeral_tx_pub_key) {
        signature = {
          ...signature,
          txKey: {
            ephemeralTxSecKey: tx_key.ephemeral_tx_sec_key,
            ephemeralTxPubKey: tx_key.ephemeral_tx_pub_key,
          },
        };
      }

      if (computed_key_image?.key_image) {
        signature = {
          ...signature,
          computedKeyImages: [...(signature.computedKeyImages ?? []), computed_key_image.key_image],
        };
      }

      if (request_index) {
        const input = inputs[request_index - 1];

        const signRes = await typedCall('DnxInputAck', 'DnxInputRequest', {
          prev_index: input.prevIndex,
          global_index: input.globalIndex,
          tx_pubkey: input.txPubkey,
          prev_out_pubkey: input.prevOutPubkey,
          amount: input.amount,
        });

        return this.processTxRequest(typedCall, signRes, signature);
      }

      const signRes = await typedCall('DnxRTSigsRequest', 'DnxSignedTx', {});

      if (
        signature.txKey == null ||
        signature.txKey.ephemeralTxSecKey == null ||
        signature.txKey.ephemeralTxPubKey == null
      ) {
        throw new Error('signatures or tx_key missing in response');
      }

      return {
        path: serializedPath(this.params.address_n),
        txKey: signature.txKey,
        computedKeyImages: signature.computedKeyImages ?? [],
        signatures: signRes.message.signatures,
        outputKeys: signRes.message.output_keys,
      };
    }

    throw new Error('Unexpected response');
  }

  async run() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());

    const res = await this.device.commands.typedCall('DnxSignTx', 'DnxInputRequest', {
      ...this.params,
    });

    return this.processTxRequest(typedCall, res, {});
  }
}
