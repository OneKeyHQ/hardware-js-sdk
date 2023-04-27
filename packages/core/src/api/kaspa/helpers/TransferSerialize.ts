/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  KaspaSignTransactionParams,
  KaspaSignInputParams,
  KaspaSignOutputParams,
} from '../../../types';
import { SignatureType } from './SignatureType';
import { HashWriter } from './HashWriter';

export function zeroHash() {
  return Buffer.alloc(32);
}

export function zeroSubnetworkID() {
  return Buffer.alloc(20);
}

function isSighashAnyoneCanPay(sighashType: number) {
  // eslint-disable-next-line no-bitwise
  return (sighashType & SignatureType.SIGHASH_ANYONECANPAY) === SignatureType.SIGHASH_ANYONECANPAY;
}

function isSighashSingle(sighashType: number) {
  // eslint-disable-next-line no-bitwise
  return (sighashType & 31) === SignatureType.SIGHASH_SINGLE;
}

function isSighashNone(sighashType: number) {
  // eslint-disable-next-line no-bitwise
  return (sighashType & 31) === SignatureType.SIGHASH_NONE;
}

function hashOutpoint(hashWriter: HashWriter, input: KaspaSignInputParams) {
  hashWriter.writeHash(Buffer.from(input.prevTxId, 'hex'));
  hashWriter.writeUInt32LE(input.outputIndex);
}

function getPreviousOutputsHash(
  transaction: KaspaSignTransactionParams,
  sighashType: SignatureType
) {
  if (isSighashAnyoneCanPay(sighashType)) {
    return zeroHash();
  }

  const hashWriter = new HashWriter();
  transaction.inputs.forEach(input => hashOutpoint(hashWriter, input));
  return hashWriter.finalize();
}

function getSequencesHash(transaction: KaspaSignTransactionParams, sighashType: SignatureType) {
  if (
    isSighashSingle(sighashType) ||
    isSighashAnyoneCanPay(sighashType) ||
    isSighashNone(sighashType)
  ) {
    return zeroHash();
  }

  const hashWriter = new HashWriter();
  transaction.inputs.forEach(input => hashWriter.writeUInt64LE(input.sequenceNumber));
  return hashWriter.finalize();
}

function getSigOpCountsHash(transaction: KaspaSignTransactionParams, sighashType: SignatureType) {
  if (isSighashAnyoneCanPay(sighashType)) {
    return zeroHash();
  }

  const hashWriter = new HashWriter();
  transaction.inputs.forEach(input => hashWriter.writeUInt8(input.sigOpCount!));
  return hashWriter.finalize();
}

function hashTxOut(hashWriter: HashWriter, output: KaspaSignOutputParams) {
  hashWriter.writeUInt64LE(output.satoshis);
  hashWriter.writeUInt16LE(0); // TODO: USE REAL SCRIPT VERSION
  hashWriter.writeVarBytes(Buffer.from(output.script, 'hex'));
}

function getOutputsHash(
  transaction: KaspaSignTransactionParams,
  inputNumber: number,
  sighashType: SignatureType
) {
  if (isSighashNone(sighashType)) {
    return zeroHash();
  }

  // SigHashSingle: If the relevant output exists - return its hash, otherwise return zero-hash
  if (isSighashSingle(sighashType)) {
    if (inputNumber >= transaction.outputs.length) {
      return zeroHash();
    }

    const hashWriter = new HashWriter();
    return hashWriter.finalize();
  }

  const hashWriter = new HashWriter();
  transaction.outputs.forEach(output => hashTxOut(hashWriter, output));
  return hashWriter.finalize();
}

/**
 * Returns a buffer of length 32 bytes with the hash that needs to be signed
 * for OP_CHECKSIG.
 *
 * @name serialize
 * @param {Transaction} transaction the transaction to sign
 * @param {number} sighashType the type of the hash
 * @param {number} inputNumber the input index for the signature
 * @param {Script} subscript the script that will be signed
 * @param {satoshisBN} input's amount (for  ForkId signatures)
 *
 */
export function serialize(transaction: KaspaSignTransactionParams, inputNumber: number) {
  const hashWriter = new HashWriter();

  hashWriter.writeUInt16LE(transaction.version);
  hashWriter.writeHash(getPreviousOutputsHash(transaction, transaction.sigHashType!));
  hashWriter.writeHash(getSequencesHash(transaction, transaction.sigHashType!));
  hashWriter.writeHash(getSigOpCountsHash(transaction, transaction.sigHashType!));

  const input = transaction.inputs[inputNumber];
  hashOutpoint(hashWriter, input);
  hashWriter.writeUInt16LE(0); // TODO: USE REAL SCRIPT VERSION
  hashWriter.writeVarBytes(Buffer.from(input.output.script, 'hex'));
  hashWriter.writeUInt64LE(input.output.satoshis);
  hashWriter.writeUInt64LE(input.sequenceNumber);
  hashWriter.writeUInt8(transaction.sigOpCount ?? 1); // sigOpCount
  hashWriter.writeHash(getOutputsHash(transaction, inputNumber, transaction.sigHashType!));
  hashWriter.writeUInt64LE(transaction.lockTime);
  hashWriter.writeHash(zeroSubnetworkID()); // TODO: USE REAL SUBNETWORK ID
  hashWriter.writeUInt64LE(0); // TODO: USE REAL GAS
  hashWriter.writeHash(zeroHash()); // TODO: USE REAL PAYLOAD HASH
  hashWriter.writeUInt8(transaction.sigHashType!);

  return {
    hash: hashWriter.finalize(),
    raw: hashWriter.toBuffer(),
  };
}
