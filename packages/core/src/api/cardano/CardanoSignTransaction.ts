import { BaseMethod } from '../BaseMethod';
import { PROTO } from '../../constants';
import { UI_REQUEST } from '../../constants/ui-request';
import { validateParams } from '../helpers/paramsValidator';
import {
  transformInput,
  Path,
  CollateralInputWithPath,
  transformCollateralInput,
  transformReferenceInput,
} from './helper/cardanoInputs';
import { transformOutput, sendOutput } from './helper/cardanoOutputs';
import { transformCertificate } from './helper/certificate';
import { tokenBundleToProto } from './helper/token';
import {
  transformAuxiliaryData,
  modifyAuxiliaryDataForBackwardsCompatibility,
} from './helper/auxiliaryData';
import { gatherWitnessPaths } from './helper/witnesses';
import { validatePath } from '../helpers/pathUtils';
import type {
  CertificateWithPoolOwnersAndRelays,
  AssetGroupWithTokens,
  CardanoSignedTxData,
  CardanoSignedTxWitness,
  CardanoAuxiliaryDataSupplement,
} from '../../types/api/cardano';

export default class CardanoSignTransaction extends BaseMethod<any> {
  hasBundle?: boolean;

  getVersionRange() {
    return {
      model_mini: {
        min: '3.0.0',
      },
      model_touch: {
        min: '4.1.0',
      },
    };
  }

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;

    const { payload } = this;

    // validate incoming parameters
    validateParams(payload, [
      { name: 'signingMode', type: 'number', required: true },
      { name: 'inputs', type: 'array', required: true },
      { name: 'outputs', type: 'array', required: true, allowEmpty: true },
      { name: 'fee', type: 'uint', required: true },
      { name: 'ttl', type: 'uint' },
      { name: 'certificates', type: 'array', allowEmpty: true },
      { name: 'withdrawals', type: 'array', allowEmpty: true },
      { name: 'mint', type: 'array', allowEmpty: true },
      { name: 'validityIntervalStart', type: 'uint' },
      { name: 'scriptDataHash', type: 'string' },
      { name: 'collateralInputs', type: 'array', allowEmpty: true },
      { name: 'requiredSigners', type: 'array', allowEmpty: true },
      { name: 'totalCollateral', type: 'uint' },
      { name: 'referenceInputs', type: 'array', allowEmpty: true },
      { name: 'protocolMagic', type: 'number', required: true },
      { name: 'networkId', type: 'number', required: true },
      { name: 'additionalWitnessRequests', type: 'array', allowEmpty: true },
      { name: 'derivationType', type: 'number' },
      { name: 'includeNetworkId', type: 'boolean' },
    ]);

    const inputsWithPath = payload.inputs.map(transformInput);
    const outputsWithData = payload.outputs.map(transformOutput);

    let certificatesWithPoolOwnersAndRelays: CertificateWithPoolOwnersAndRelays[] = [];
    if (payload.certificates) {
      certificatesWithPoolOwnersAndRelays = payload.certificates.map(transformCertificate);
    }

    let withdrawals: PROTO.CardanoTxWithdrawal[] = [];
    if (payload.withdrawals) {
      withdrawals = payload.withdrawals.map((withdrawal: any) => {
        validateParams(withdrawal, [
          { name: 'amount', type: 'uint', required: true },
          { name: 'scriptHash', type: 'string' },
          { name: 'keyHash', type: 'string' },
        ]);
        return {
          path: withdrawal.path ? validatePath(withdrawal.path, 5) : undefined,
          amount: withdrawal.amount,
          script_hash: withdrawal.scriptHash,
          key_hash: withdrawal.keyHash,
        };
      });
    }

    let mint: AssetGroupWithTokens[] = [];
    if (payload.mint) {
      mint = tokenBundleToProto(payload.mint);
    }

    let auxiliaryData;
    if (payload.auxiliaryData) {
      auxiliaryData = transformAuxiliaryData(payload.auxiliaryData);
    }

    let additionalWitnessRequests: Path[] = [];
    if (payload.additionalWitnessRequests) {
      additionalWitnessRequests = payload.additionalWitnessRequests.map((witnessRequest: any) =>
        validatePath(witnessRequest, 3)
      );
    }

    let collateralInputsWithPath: CollateralInputWithPath[] = [];
    if (payload.collateralInputs) {
      collateralInputsWithPath = payload.collateralInputs.map(transformCollateralInput);
    }

    let requiredSigners: PROTO.CardanoTxRequiredSigner[] = [];
    if (payload.requiredSigners) {
      requiredSigners = payload.requiredSigners.map((requiredSigner: any) => {
        validateParams(requiredSigner, [{ name: 'keyHash', type: 'string' }]);
        return {
          key_path: requiredSigner.keyPath ? validatePath(requiredSigner.keyPath, 3) : undefined,
          key_hash: requiredSigner.keyHash,
        } as PROTO.CardanoTxRequiredSigner;
      });
    }

    const collateralReturnWithData = payload.collateralReturn
      ? transformOutput(payload.collateralReturn)
      : undefined;

    let referenceInputs: PROTO.CardanoTxReferenceInput[] = [];
    if (payload.referenceInputs) {
      referenceInputs = payload.referenceInputs.map(transformReferenceInput);
    }

    this.params = {
      signingMode: payload.signingMode,
      inputsWithPath,
      outputsWithData,
      fee: payload.fee,
      ttl: payload.ttl,
      certificatesWithPoolOwnersAndRelays,
      withdrawals,
      mint,
      auxiliaryData,
      validityIntervalStart: payload.validityIntervalStart,
      scriptDataHash: payload.scriptDataHash,
      collateralInputsWithPath,
      requiredSigners,
      collateralReturnWithData,
      totalCollateral: payload.totalCollateral,
      referenceInputs,
      protocolMagic: payload.protocolMagic,
      networkId: payload.networkId,
      witnessPaths: gatherWitnessPaths(
        inputsWithPath,
        certificatesWithPoolOwnersAndRelays,
        withdrawals,
        collateralInputsWithPath,
        requiredSigners,
        additionalWitnessRequests,
        payload.signingMode
      ),
      additionalWitnessRequests,
      derivationType:
        typeof payload.derivationType !== 'undefined'
          ? payload.derivationType
          : PROTO.CardanoDerivationType.ICARUS,
      includeNetworkId: payload.includeNetworkId,
    };
  }

  async signTx(): Promise<CardanoSignedTxData> {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());

    const hasAuxiliaryData = !!this.params.auxiliaryData;

    const signTxInitMessage = {
      signing_mode: this.params.signingMode,
      protocol_magic: this.params.protocolMagic,
      network_id: this.params.networkId,
      inputs_count: this.params.inputsWithPath.length,
      outputs_count: this.params.outputsWithData.length,
      fee: this.params.fee,
      ttl: this.params.ttl,
      certificates_count: this.params.certificatesWithPoolOwnersAndRelays.length,
      withdrawals_count: this.params.withdrawals.length,
      has_auxiliary_data: hasAuxiliaryData,
      validity_interval_start: this.params.validityIntervalStart,
      witness_requests_count: this.params.witnessPaths.length,
      minting_asset_groups_count: this.params.mint.length,
      script_data_hash: this.params.scriptDataHash,
      collateral_inputs_count: this.params.collateralInputsWithPath.length,
      required_signers_count: this.params.requiredSigners.length,
      has_collateral_return: this.params.collateralReturnWithData != null,
      total_collateral: this.params.totalCollateral,
      reference_inputs_count: this.params.referenceInputs.length,
      derivation_type: this.params.derivationType,
      include_network_id: this.params.includeNetworkId,
    };

    // init
    await typedCall('CardanoSignTxInit', 'CardanoTxItemAck', signTxInitMessage);
    // inputs
    for (const { input } of this.params.inputsWithPath) {
      await typedCall('CardanoTxInput', 'CardanoTxItemAck', input);
    }
    // outputs and tokens
    for (const outputWithData of this.params.outputsWithData) {
      await sendOutput(typedCall, outputWithData);
    }
    // certificates, owners and relays
    for (const { certificate, poolOwners, poolRelays } of this.params
      .certificatesWithPoolOwnersAndRelays) {
      await typedCall('CardanoTxCertificate', 'CardanoTxItemAck', certificate);
      for (const poolOwner of poolOwners) {
        await typedCall('CardanoPoolOwner', 'CardanoTxItemAck', poolOwner);
      }
      for (const poolRelay of poolRelays) {
        await typedCall('CardanoPoolRelayParameters', 'CardanoTxItemAck', poolRelay);
      }
    }
    // withdrawals
    for (const withdrawal of this.params.withdrawals) {
      await typedCall('CardanoTxWithdrawal', 'CardanoTxItemAck', withdrawal);
    }
    // auxiliary data
    let auxiliaryDataSupplement: CardanoAuxiliaryDataSupplement | undefined;
    if (this.params.auxiliaryData) {
      const { catalyst_registration_parameters } = this.params.auxiliaryData;
      if (catalyst_registration_parameters) {
        this.params.auxiliaryData = modifyAuxiliaryDataForBackwardsCompatibility(
          this.params.auxiliaryData
        );
      }

      const { message } = await typedCall(
        'CardanoTxAuxiliaryData',
        'CardanoTxAuxiliaryDataSupplement',
        this.params.auxiliaryData
      );

      const auxiliaryDataType: any = PROTO.CardanoTxAuxiliaryDataSupplementType[message.type];
      if (auxiliaryDataType !== PROTO.CardanoTxAuxiliaryDataSupplementType.NONE) {
        auxiliaryDataSupplement = {
          type: auxiliaryDataType,
          auxiliaryDataHash: message.auxiliary_data_hash as unknown as string,
          // @ts-expect-error
          governanceSignature: message.governance_signature,
          catalystSignature: message.governance_signature,
        };
      }
      await typedCall('CardanoTxHostAck', 'CardanoTxItemAck');
    }
    // mint
    if (this.params.mint.length > 0) {
      await typedCall('CardanoTxMint', 'CardanoTxItemAck', {
        asset_groups_count: this.params.mint.length,
      });
      for (const assetGroup of this.params.mint) {
        await typedCall('CardanoAssetGroup', 'CardanoTxItemAck', {
          policy_id: assetGroup.policyId,
          tokens_count: assetGroup.tokens.length,
        });
        for (const token of assetGroup.tokens) {
          await typedCall('CardanoToken', 'CardanoTxItemAck', token);
        }
      }
    }
    // collateral inputs
    for (const { collateralInput } of this.params.collateralInputsWithPath) {
      await typedCall('CardanoTxCollateralInput', 'CardanoTxItemAck', collateralInput);
    }
    // required signers
    for (const requiredSigner of this.params.requiredSigners) {
      await typedCall('CardanoTxRequiredSigner', 'CardanoTxItemAck', requiredSigner);
    }
    // collateral return
    if (this.params.collateralReturnWithData) {
      await sendOutput(typedCall, this.params.collateralReturnWithData);
    }
    // reference inputs
    for (const referenceInput of this.params.referenceInputs) {
      await typedCall('CardanoTxReferenceInput', 'CardanoTxItemAck', referenceInput);
    }
    // witnesses
    const witnesses: CardanoSignedTxWitness[] = [];
    for (const path of this.params.witnessPaths) {
      const { message } = await typedCall('CardanoTxWitnessRequest', 'CardanoTxWitnessResponse', {
        path,
      });
      witnesses.push({
        type: PROTO.CardanoTxWitnessType[message.type] as any,
        pubKey: message.pub_key,
        signature: message.signature,
        chainCode: message.chain_code,
      });
    }
    // tx hash
    const { message: txBodyHashMessage } = await typedCall('CardanoTxHostAck', 'CardanoTxBodyHash');
    // finish
    await typedCall('CardanoTxHostAck', 'CardanoSignTxFinished');

    return { hash: txBodyHashMessage.tx_hash, witnesses, auxiliaryDataSupplement };
  }

  run() {
    return this.signTx();
  }
}
