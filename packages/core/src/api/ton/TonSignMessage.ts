import semver from 'semver';
import BigNumber from 'bignumber.js';
import { isEmpty } from 'lodash';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { DeviceModelToTypes } from '../../types';
import { formatAnyHex, stripHexStartZeroes } from '../helpers/hexUtils';
import { cutString } from '../helpers/stringUtils';

import type { DeviceFirmwareRange, TonSignMessageParams } from '../../types';
import type {
  TonSignMessage as HardwareTonSignMessage,
  TonSignedMessage,
  TonTxAck,
} from '@onekeyfe/hd-transport';
import type { TonSignedMessageResponse } from '../../types/api/tonSignMessage';

export default class TonSignMessage extends BaseMethod<HardwareTonSignMessage> {
  initState: string | null = null;

  init() {
    this.strictCheckDeviceSupport = true;
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    // init params
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'destination', type: 'string' },
      { name: 'jettonMasterAddress', type: 'string' },
      { name: 'jettonWalletAddress', type: 'string' },
      { name: 'tonAmount' },
      { name: 'jettonAmount' },
      { name: 'fwdFee' },
      { name: 'comment', type: 'string' },
      { name: 'isRawData', type: 'boolean' },
      { name: 'mode', type: 'number' },
      { name: 'seqno', type: 'number' },
      { name: 'expireAt' },
      { name: 'walletVersion' },
      { name: 'walletId', type: 'number' },
      { name: 'workchain' },
      { name: 'isBounceable', type: 'boolean' },
      { name: 'isTestnetOnly', type: 'boolean' },
      { name: 'extDestination', type: 'array' },
      { name: 'extTonAmount', type: 'array' },
      { name: 'extPayload', type: 'array' },
      { name: 'initState', type: 'hexString' },
      { name: 'signingMessageRepr', type: 'hexString' },
    ]);

    const { path } = this.payload as TonSignMessageParams;
    const addressN = validatePath(path, 3);

    this.initState = stripHexStartZeroes(formatAnyHex(this.payload.initState));
    const initStateLength = this.initState == null ? 0 : this.initState.length / 2;
    this.params = {
      address_n: addressN,
      destination: this.payload.destination,
      jetton_master_address: this.payload.jettonMasterAddress,
      jetton_wallet_address: this.payload.jettonWalletAddress,
      ton_amount: this.payload.tonAmount,
      fwd_fee: this.payload.fwdFee,
      comment: this.payload.comment,
      mode: this.payload.mode,
      is_raw_data: this.payload.isRawData,
      seqno: this.payload.seqno,
      expire_at: this.payload.expireAt,
      wallet_version: this.payload.walletVersion,
      wallet_id: this.payload.walletId,
      workchain: this.payload.workchain,
      is_bounceable: this.payload.isBounceable,
      is_testnet_only: this.payload.isTestnetOnly,
      ext_destination: this.payload.extDestination,
      ext_ton_amount: this.payload.extTonAmount,
      ext_payload: this.payload.extPayload,
      init_data_length: initStateLength,
      signing_message_repr: stripHexStartZeroes(formatAnyHex(this.payload.signingMessageRepr)),
    };
  }

  getVersionRange() {
    return {
      pro2: {
        min: '0.0.0',
      },
      model_touch: {
        min: '4.10.0',
      },
      model_classic1s: {
        min: '3.10.0',
      },
    };
  }

  getSupportJettonAmountBytesVersionRange(): DeviceFirmwareRange {
    return {
      pro: {
        min: '4.10.2',
      },
      model_classic1s: {
        min: '3.10.0',
      },
    };
  }

  checkSupportJettonAmountBytes() {
    const firmwareVersion = this.device.getCurrentFirmwareVersionString() ?? '0.0.0';
    const versionRange = this.device.getCurrentMethodVersionRange(
      type => this.getSupportJettonAmountBytesVersionRange()[type]
    );

    if (!versionRange) {
      // Equipment that does not need to be repaired
      return true;
    }

    if (semver.valid(firmwareVersion) && semver.gte(firmwareVersion, versionRange.min)) {
      return true;
    }
    return false;
  }

  getFixCommentErrorVersionRange(): DeviceFirmwareRange {
    return {
      pro: {
        min: '4.10.1',
      },
      model_classic1s: {
        min: '3.10.0',
      },
    };
  }

  checkFixCommentError() {
    const { comment, jettonAmount } = this.payload;
    this.checkFeatureVersionLimit(
      () => !isEmpty(comment) && jettonAmount !== null && jettonAmount !== undefined,
      () => this.getFixCommentErrorVersionRange()
    );
  }

  getFixInitStateErrorVersionRange(): DeviceFirmwareRange {
    return {
      pro: {
        min: '4.13.0',
      },
      model_classic1s: {
        min: '3.12.0',
      },
    };
  }

  checkFixInitStateError() {
    const { initState, signingMessageRepr } = this.payload;
    this.checkFeatureVersionLimit(
      () => !isEmpty(initState) && !isEmpty(signingMessageRepr),
      () => this.getFixInitStateErrorVersionRange()
    );
  }

  processTxRequest = async (
    request: TonSignedMessage,
    data: string
  ): Promise<TonTxAck | TonSignedMessageResponse> => {
    if (!request.init_data_length) {
      const deviceType = this.device.getCurrentDeviceType();
      const hasClassic = DeviceModelToTypes.model_classic1s.includes(deviceType);
      // use signing_message_repr sign, not exists signning_message, skip validate
      const hasSigningMessageRepr = request.signning_message == null;

      return Promise.resolve({
        ...request,
        skip_validate: hasClassic || hasSigningMessageRepr,
      });
    }

    const [first, rest] = cutString(data, request.init_data_length * 2);
    const response = await this.device.commands.typedCall('TonTxAck', 'TonSignedMessage', {
      init_data_chunk: first,
    });

    return this.processTxRequest(response.message, rest);
  };

  async run() {
    // checkFixCommentError
    this.checkFixCommentError();
    this.checkFixInitStateError();

    // check jettonAmount
    const { jettonAmount } = this.payload;
    if (jettonAmount) {
      if (this.checkSupportJettonAmountBytes()) {
        this.params.jetton_amount_bytes = stripHexStartZeroes(
          formatAnyHex(new BigNumber(jettonAmount).toString(16))
        );
      } else {
        this.params.jetton_amount = jettonAmount;
      }
    }

    let data = this.initState ?? '';
    if (this.initState) {
      const [first, rest] = cutString(data, 1024 * 2);
      this.params.init_data_initial_chunk = first;
      data = rest;
    }
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    const res = await typedCall('TonSignMessage', 'TonSignedMessage', {
      ...this.params,
    });
    return this.processTxRequest(res.message, data);
  }
}
