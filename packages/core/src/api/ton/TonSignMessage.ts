import { TonSignMessage as HardwareTonSignMessage } from '@onekeyfe/hd-transport';
import semver from 'semver';
import BigNumber from 'bignumber.js';
import { isEmpty } from 'lodash';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { DeviceFirmwareRange, DeviceModelToTypes, TonSignMessageParams } from '../../types';
import { getDeviceFirmwareVersion, getDeviceType, getMethodVersionRange } from '../../utils';

export default class TonSignMessage extends BaseMethod<HardwareTonSignMessage> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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
    ]);

    const { path } = this.payload as TonSignMessageParams;
    const addressN = validatePath(path, 3);

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
    };
  }

  getVersionRange() {
    return {
      model_touch: {
        min: '4.10.0',
      },
      classic1s: {
        min: '3.10.0',
      },
    };
  }

  getSupportJettonAmountBytesVersionRange(): DeviceFirmwareRange {
    return {
      pro: {
        min: '4.10.2',
      },
    };
  }

  checkSupportJettonAmountBytes() {
    const firmwareVersion = getDeviceFirmwareVersion(this.device.features)?.join('.');
    const versionRange = getMethodVersionRange(
      this.device.features,
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
    };
  }

  checkFixCommentError() {
    // The issue of missing comments when transferring tokens.
    const { comment, jettonAmount } = this.payload;

    if (isEmpty(comment) || jettonAmount === null || jettonAmount === undefined) {
      return;
    }

    const firmwareVersion = getDeviceFirmwareVersion(this.device.features)?.join('.');
    const versionRange = getMethodVersionRange(
      this.device.features,
      type => this.getFixCommentErrorVersionRange()[type]
    );

    if (!versionRange) {
      // Equipment that does not need to be repaired
      return;
    }

    if (semver.valid(firmwareVersion) && semver.lt(firmwareVersion, versionRange.min)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodNeedUpgradeFirmware,
        `Device firmware version is too low, please update to ${versionRange.min}`,
        { current: firmwareVersion, require: versionRange.min }
      );
    }
  }

  async run() {
    // checkFixCommentError
    this.checkFixCommentError();

    // check jettonAmount
    const { jettonAmount } = this.payload;
    if (jettonAmount) {
      if (this.checkSupportJettonAmountBytes()) {
        this.params.jetton_amount_bytes = new BigNumber(jettonAmount).toString(16);
      } else {
        this.params.jetton_amount = jettonAmount;
      }
    }

    const deviceType = getDeviceType(this.device.features);
    const res = await this.device.commands.typedCall('TonSignMessage', 'TonSignedMessage', {
      ...this.params,
    });
    return Promise.resolve({
      ...res.message,
      skip_validate: DeviceModelToTypes.model_mini.includes(deviceType),
    });
  }
}
