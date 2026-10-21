import {
  StarknetDAMode,
  StarknetPrivacyViewingKeyDerivation,
  StarknetPublicKeyType,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from '../BaseMethod';
import { validatePath } from '../helpers/pathUtils';
import { invalidParameter, validateParams } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';
import {
  formatHexResult,
  toEnumValue,
  toFeltHex,
  toFeltHexArray,
  toU128Hex,
  toUint64,
} from './normalize';

import type {
  StarknetResourceBounds as HardwareStarknetResourceBounds,
  StarknetSignTx as HardwareStarknetSignTx,
} from '@onekeyfe/hd-transport';
import type {
  StarknetResourceBound,
  StarknetSignTransactionParams,
  StarknetSignedTx,
} from '../../types/api/starknetSignTransaction';
import type { DeviceFirmwareRange } from '../../types';

// The device only signs v3 transactions.
const TRANSACTION_VERSION = 3;

const toResourceBound = (bound: StarknetResourceBound | undefined, name: string) => {
  if (!bound || typeof bound !== 'object') {
    throw invalidParameter(`Missing required parameter: ${name}`);
  }
  const result: HardwareStarknetResourceBounds = {
    max_amount: toUint64(bound.maxAmount, `${name}.maxAmount`),
    max_price_per_unit: toU128Hex(bound.maxPricePerUnit, `${name}.maxPricePerUnit`),
  };
  return result;
};

export default class StarknetSignTransaction extends BaseMethod<HardwareStarknetSignTx> {
  calldata: string[] = [];

  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'chainId', required: true },
      { name: 'nonce', required: true },
      { name: 'resourceBounds', type: 'object', required: true },
      { name: 'paymasterData', type: 'array', allowEmpty: true },
      { name: 'invokeV3', type: 'object' },
      { name: 'deployAccountV3', type: 'object' },
    ]);

    const payload = this.payload as StarknetSignTransactionParams;
    const { invokeV3, deployAccountV3, resourceBounds } = payload;
    if (Boolean(invokeV3) === Boolean(deployAccountV3)) {
      throw invalidParameter('Exactly one of invokeV3 or deployAccountV3 is required');
    }

    const params: HardwareStarknetSignTx = {
      address_n: validatePath(payload.path, 3),
      public_key_type: toEnumValue(
        payload.publicKeyType,
        StarknetPublicKeyType,
        StarknetPublicKeyType.STARK,
        'publicKeyType'
      ),
      version: TRANSACTION_VERSION,
      chain_id: toFeltHex(payload.chainId, 'chainId'),
      nonce: toFeltHex(payload.nonce, 'nonce'),
      resource_bounds: {
        l1_gas: toResourceBound(resourceBounds.l1Gas, 'resourceBounds.l1Gas'),
        l2_gas: toResourceBound(resourceBounds.l2Gas, 'resourceBounds.l2Gas'),
        l1_data_gas: toResourceBound(resourceBounds.l1DataGas, 'resourceBounds.l1DataGas'),
      },
      tip: toUint64(payload.tip ?? 0, 'tip'),
      paymaster_data: toFeltHexArray(payload.paymasterData, 'paymasterData'),
      nonce_data_availability_mode: toEnumValue(
        payload.nonceDataAvailabilityMode,
        StarknetDAMode,
        StarknetDAMode.STARKNET_DA_MODE_L1,
        'nonceDataAvailabilityMode'
      ),
      fee_data_availability_mode: toEnumValue(
        payload.feeDataAvailabilityMode,
        StarknetDAMode,
        StarknetDAMode.STARKNET_DA_MODE_L1,
        'feeDataAvailabilityMode'
      ),
    };

    if (payload.privacyViewingKeyDerivation !== undefined) {
      params.privacy_viewing_key_derivation_version = toEnumValue(
        payload.privacyViewingKeyDerivation,
        StarknetPrivacyViewingKeyDerivation,
        StarknetPrivacyViewingKeyDerivation.STARKNET_PRIVACY_VIEWING_KEY_DERIVATION_ACCOUNT_LEAF_V1,
        'privacyViewingKeyDerivation'
      );
    }

    if (invokeV3) {
      validateParams(invokeV3, [
        { name: 'senderAddress', required: true },
        { name: 'calldata', type: 'array', required: true, allowEmpty: true },
        { name: 'accountDeploymentData', type: 'array', allowEmpty: true },
        { name: 'proofFacts', type: 'array', allowEmpty: true },
      ]);
      this.calldata = toFeltHexArray(invokeV3.calldata, 'invokeV3.calldata');
      params.invoke_v3 = {
        sender_address: toFeltHex(invokeV3.senderAddress, 'invokeV3.senderAddress'),
        calldata_count: this.calldata.length,
        account_deployment_data: toFeltHexArray(
          invokeV3.accountDeploymentData,
          'invokeV3.accountDeploymentData'
        ),
        proof_facts: toFeltHexArray(invokeV3.proofFacts, 'invokeV3.proofFacts'),
      };
    } else if (deployAccountV3) {
      validateParams(deployAccountV3, [
        { name: 'classHash', required: true },
        { name: 'contractAddressSalt', required: true },
        { name: 'constructorCalldata', type: 'array', required: true, allowEmpty: true },
      ]);
      params.deploy_account_v3 = {
        class_hash: toFeltHex(deployAccountV3.classHash, 'deployAccountV3.classHash'),
        contract_address_salt: toFeltHex(
          deployAccountV3.contractAddressSalt,
          'deployAccountV3.contractAddressSalt'
        ),
        constructor_calldata: toFeltHexArray(
          deployAccountV3.constructorCalldata,
          'deployAccountV3.constructorCalldata'
        ),
      };
      if (deployAccountV3.expectedContractAddress !== undefined) {
        params.deploy_account_v3.expected_contract_address = toFeltHex(
          deployAccountV3.expectedContractAddress,
          'deployAccountV3.expectedContractAddress'
        );
      }
    }

    this.params = params;
  }

  getVersionRange(): DeviceFirmwareRange {
    return {
      model_pro2: {
        min: '0.0.0',
      },
    };
  }

  async run(): Promise<StarknetSignedTx> {
    const commands = this.device.getCommands();
    const typedCall = commands.typedCall.bind(commands);

    let response = await typedCall(
      'StarknetSignTx',
      ['StarknetSignedTx', 'StarknetCalldataRequest'],
      { ...this.params }
    );

    // The device pulls the invoke calldata in order, one slice per request.
    let delivered = 0;
    while (response.type === 'StarknetCalldataRequest') {
      const { offset, count } = response.message;
      if (
        !Number.isSafeInteger(offset) ||
        !Number.isSafeInteger(count) ||
        offset !== delivered ||
        count <= 0 ||
        offset + count > this.calldata.length
      ) {
        throw ERRORS.TypedError(
          HardwareErrorCode.ResponseUnexpectTypeError,
          `device requested ${count} calldata felts at offset ${offset} of ${this.calldata.length}`
        );
      }
      response = await typedCall(
        'StarknetCalldataAck',
        ['StarknetSignedTx', 'StarknetCalldataRequest'],
        { calldata: this.calldata.slice(offset, offset + count) }
      );
      delivered = offset + count;
    }

    if (delivered !== this.calldata.length) {
      throw ERRORS.TypedError(
        HardwareErrorCode.ResponseUnexpectTypeError,
        'device signed before receiving the whole calldata'
      );
    }

    return {
      transactionHash: formatHexResult(response.message.transaction_hash),
      signature: formatHexResult(response.message.signature),
    };
  }
}
