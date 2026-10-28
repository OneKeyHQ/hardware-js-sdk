import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from '../BaseMethod';
import { validatePath } from '../helpers/pathUtils';
import { invalidParameter, validateParams } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';
import { getMoneroVersionRange, validateMoneroNetworkType } from './helpers';

import type {
  MoneroTransactionAllOutSetAck,
  MoneroTransactionData,
  MoneroTransactionSetInputAck,
  MoneroTransactionSourceEntry,
} from '@onekeyfe/hd-transport';
import type {
  MoneroSignTransactionParams,
  MoneroSignTransactionResult,
} from '../../types/api/moneroSignTransaction';

const BP_PLUS_VERSION = 4;
// InitAck asks the host to prove the range proof itself (more than 2 outputs).
const OFFLOAD_RANGE_PROOF = 1;
// tx.vin[i] ends with the key image (firmware offloading_keys.get_ki_from_vini).
const KEY_IMAGE_HEX_LENGTH = 64;

type SignTransactionParams = {
  address_n: number[];
  network_type: number;
  tsx_data: MoneroTransactionData;
  inputs: MoneroTransactionSourceEntry[];
};

// What SetInputAck returned for one input; sent back unchanged in later steps.
type InputState = {
  origIdx: number;
  keyImage: string;
  vini: string;
  vini_hmac: string;
  pseudo_out: string;
  pseudo_out_hmac: string;
  pseudo_out_alpha: string;
  spend_key: string;
};

const invalidResponse = (message: string) =>
  ERRORS.TypedError(HardwareErrorCode.CallMethodError, message);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireBytes = (value: string | null | undefined, name: string) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidResponse(`Device response is missing ${name}`);
  }
  return value;
};

// The transport cannot encode null bytes fields. Normalize once so every step
// resends the very same entry: the device HMACs its re-encoding.
const withoutNulls = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutNulls);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined)
      .map(([key, item]) => [key, withoutNulls(item)])
  );
};

const validateObjects = (values: unknown[], name: string) => {
  values.forEach((value, index) => {
    if (!isObject(value)) {
      throw invalidParameter(`${name}[${index}] must be an object`);
    }
  });
};

const validateTsxData = (tsxData: MoneroTransactionData, inputCount: number) => {
  if (tsxData.num_inputs !== inputCount) {
    throw invalidParameter('tsxData.num_inputs must equal the number of inputs');
  }
  const { outputs } = tsxData;
  if (!Array.isArray(outputs) || outputs.length < 2) {
    throw invalidParameter('tsxData.outputs must hold at least 2 outputs');
  }
  validateObjects(outputs, 'tsxData.outputs');
  const hardFork = tsxData.hard_fork;
  if (typeof hardFork !== 'number' || !Number.isSafeInteger(hardFork) || hardFork <= 0) {
    throw invalidParameter('tsxData.hard_fork is required');
  }

  const rsigData = tsxData.rsig_data;
  if (!isObject(rsigData) || rsigData.bp_version !== BP_PLUS_VERSION) {
    throw invalidParameter('tsxData.rsig_data.bp_version must be 4 (Bulletproof+)');
  }
  const { grouping } = rsigData;
  const validBatches =
    Array.isArray(grouping) &&
    grouping.every(size => Number.isSafeInteger(size) && size > 0) &&
    grouping.reduce((sum, size) => sum + size, 0) === outputs.length;
  if (!validBatches) {
    throw invalidParameter('tsxData.rsig_data.grouping must add up to the number of outputs');
  }
};

const parseSetInputAck = (ack: MoneroTransactionSetInputAck, origIdx: number): InputState => {
  const name = (field: string) => `${field} of input ${origIdx}`;
  const vini = requireBytes(ack.vini, name('vini'));
  if (vini.length < KEY_IMAGE_HEX_LENGTH) {
    throw invalidResponse(`Device returned a vini without a key image for input ${origIdx}`);
  }
  return {
    origIdx,
    keyImage: vini.slice(-KEY_IMAGE_HEX_LENGTH).toLowerCase(),
    vini,
    vini_hmac: requireBytes(ack.vini_hmac, name('vini_hmac')),
    pseudo_out: requireBytes(ack.pseudo_out, name('pseudo_out')),
    pseudo_out_hmac: requireBytes(ack.pseudo_out_hmac, name('pseudo_out_hmac')),
    pseudo_out_alpha: requireBytes(ack.pseudo_out_alpha, name('pseudo_out_alpha')),
    spend_key: requireBytes(ack.spend_key, name('spend_key')),
  };
};

const parseAllOutSetAck = (ack: MoneroTransactionAllOutSetAck) => {
  const { rv } = ack;
  if (!rv || rv.txn_fee == null || rv.rv_type == null) {
    throw invalidResponse('Device response is missing rv');
  }
  return {
    extra: requireBytes(ack.extra, 'extra'),
    txPrefixHash: requireBytes(ack.tx_prefix_hash, 'tx_prefix_hash'),
    fullMessageHash: requireBytes(ack.full_message_hash, 'full_message_hash'),
    rv: {
      txnFee: String(rv.txn_fee),
      message: requireBytes(rv.message, 'rv.message'),
      rvType: rv.rv_type,
    },
  };
};

// The device hashes tx.vin in this order and requires strictly descending key
// images, compared byte-wise (equal-length lowercase hex compares the same way).
const sortByKeyImage = (inputs: InputState[]) => {
  const sorted = [...inputs].sort((a, b) => {
    if (a.keyImage === b.keyImage) return 0;
    return a.keyImage > b.keyImage ? -1 : 1;
  });
  sorted.forEach((input, index) => {
    if (index > 0 && sorted[index - 1].keyImage === input.keyImage) {
      throw invalidResponse('Two inputs have the same key image');
    }
  });
  return sorted;
};

export default class MoneroSignTransaction extends BaseMethod<SignTransactionParams> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;

    const payload = this.payload as MoneroSignTransactionParams;
    validateParams(payload, [
      { name: 'path', required: true },
      { name: 'networkType', type: 'number' },
      { name: 'tsxData', type: 'object', required: true },
      { name: 'inputs', type: 'array', required: true },
    ]);
    if (!isObject(payload.tsxData)) {
      throw invalidParameter('tsxData must be an object');
    }
    if (!Array.isArray(payload.inputs) || payload.inputs.length === 0) {
      throw invalidParameter('inputs must be a non-empty array');
    }
    validateObjects(payload.inputs, 'inputs');

    const tsxData = withoutNulls(payload.tsxData) as MoneroTransactionData;
    validateTsxData(tsxData, payload.inputs.length);

    this.params = {
      address_n: validatePath(payload.path, 3),
      network_type: validateMoneroNetworkType(payload.networkType),
      tsx_data: tsxData,
      inputs: payload.inputs.map(input => withoutNulls(input) as MoneroTransactionSourceEntry),
    };
  }

  getVersionRange() {
    return getMoneroVersionRange();
  }

  async run(): Promise<MoneroSignTransactionResult> {
    const { address_n, network_type, tsx_data, inputs } = this.params;
    const { outputs } = tsx_data;

    const init = await this.device.commands.typedCall(
      'MoneroTransactionInitRequest',
      'MoneroTransactionInitAck',
      { version: 0, address_n, network_type, tsx_data }
    );
    if (init.message.rsig_data?.offload_type === OFFLOAD_RANGE_PROOF) {
      throw invalidResponse(
        'The device asked the host to prove the range proof, which is not supported: send at most 2 outputs'
      );
    }
    const { hmacs } = init.message;
    if (!Array.isArray(hmacs) || hmacs.length !== outputs.length) {
      throw invalidResponse('Device returned a wrong number of output HMACs');
    }

    const states: InputState[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const res = await this.device.commands.typedCall(
        'MoneroTransactionSetInputRequest',
        'MoneroTransactionSetInputAck',
        { src_entr: inputs[i] }
      );
      states.push(parseSetInputAck(res.message, i));
    }
    const sorted = sortByKeyImage(states);

    for (const input of sorted) {
      await this.device.commands.typedCall(
        'MoneroTransactionInputViniRequest',
        'MoneroTransactionInputViniAck',
        {
          src_entr: inputs[input.origIdx],
          vini: input.vini,
          vini_hmac: input.vini_hmac,
          pseudo_out: input.pseudo_out,
          pseudo_out_hmac: input.pseudo_out_hmac,
          orig_idx: input.origIdx,
        }
      );
    }

    await this.device.commands.typedCall(
      'MoneroTransactionAllInputsSetRequest',
      'MoneroTransactionAllInputsSetAck',
      {}
    );

    const txOuts: string[] = [];
    const outPks: string[] = [];
    const ecdhInfos: string[] = [];
    const rsigs: string[] = [];
    for (let i = 0; i < outputs.length; i++) {
      const res = await this.device.commands.typedCall(
        'MoneroTransactionSetOutputRequest',
        'MoneroTransactionSetOutputAck',
        { dst_entr: outputs[i], dst_entr_hmac: hmacs[i] }
      );
      txOuts.push(requireBytes(res.message.tx_out, `tx_out of output ${i}`));
      outPks.push(requireBytes(res.message.out_pk, `out_pk of output ${i}`));
      ecdhInfos.push(requireBytes(res.message.ecdh_info, `ecdh_info of output ${i}`));
      // The last output of a batch carries the batch's range proof.
      const rsig = res.message.rsig_data?.rsig;
      if (rsig) rsigs.push(rsig);
    }
    if (rsigs.length !== 1) {
      throw invalidResponse(`Expected one aggregated range proof, got ${rsigs.length}`);
    }

    const allOut = await this.device.commands.typedCall(
      'MoneroTransactionAllOutSetRequest',
      'MoneroTransactionAllOutSetAck',
      {}
    );
    const prefix = parseAllOutSetAck(allOut.message);

    const signatures: string[] = [];
    const pseudoOuts: string[] = [];
    for (const input of sorted) {
      const res = await this.device.commands.typedCall(
        'MoneroTransactionSignInputRequest',
        'MoneroTransactionSignInputAck',
        {
          src_entr: inputs[input.origIdx],
          vini: input.vini,
          vini_hmac: input.vini_hmac,
          pseudo_out: input.pseudo_out,
          pseudo_out_hmac: input.pseudo_out_hmac,
          pseudo_out_alpha: input.pseudo_out_alpha,
          spend_key: input.spend_key,
          orig_idx: input.origIdx,
        }
      );
      signatures.push(requireBytes(res.message.signature, `signature of input ${input.origIdx}`));
      // The device rebalances the last input's mask, so its pseudo-out changes here.
      pseudoOuts.push(requireBytes(res.message.pseudo_out, `pseudo_out of input ${input.origIdx}`));
    }

    const final = await this.device.commands.typedCall(
      'MoneroTransactionFinalRequest',
      'MoneroTransactionFinalAck',
      {}
    );

    return {
      origIndices: sorted.map(input => input.origIdx),
      vinis: sorted.map(input => input.vini),
      pseudoOuts,
      signatures,
      txOuts,
      outPks,
      ecdhInfos,
      rsig: rsigs[0],
      ...prefix,
      openingKey: requireBytes(final.message.opening_key, 'opening_key'),
      salt: requireBytes(final.message.salt, 'salt'),
      randMult: requireBytes(final.message.rand_mult, 'rand_mult'),
      txEncKeys: requireBytes(final.message.tx_enc_keys, 'tx_enc_keys'),
    };
  }
}
