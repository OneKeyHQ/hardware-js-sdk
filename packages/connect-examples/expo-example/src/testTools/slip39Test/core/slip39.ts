/* eslint-disable radix, @typescript-eslint/no-var-requires, max-classes-per-file, @typescript-eslint/no-non-null-assertion */
// SLIP39 implementation based on the reference slip39-js library
// see: https://github.com/ilap/slip39-js
// Compatible with SLIP-0039 standard: https://github.com/satoshilabs/slips/blob/master/slip-0039.md

import {
  MIN_ENTROPY_BITS,
  bitsToBytes,
  generateIdentifier,
  crypt,
  splitSecret,
  combineMnemonics,
  validateMnemonic,
  encodeMnemonic,
} from './slip39Utils';
import { Slip39Node } from './slip39Node';

const MAX_DEPTH = 2;

interface Slip39Options {
  iterationExponent?: number;
  extendableBackupFlag?: number;
  identifier?: number[];
  groupCount?: number;
  groupThreshold?: number;
}

interface FromArrayOptions {
  passphrase?: string;
  threshold?: number;
  groups?: Array<[number, number, string]>;
  iterationExponent?: number;
  extendableBackupFlag?: number;
  title?: string;
}

//
// The javascript implementation of the SLIP-0039: Shamir's Secret-Sharing for Mnemonic Codes
// see: https://github.com/satoshilabs/slips/blob/master/slip-0039.md)
//
class Slip39 {
  public iterationExponent: number;

  public extendableBackupFlag: number;

  public identifier: number[];

  public groupCount: number;

  public groupThreshold: number;

  public root?: Slip39Node;

  constructor({
    iterationExponent = 1,
    extendableBackupFlag = 0,
    identifier = [],
    groupCount = 1,
    groupThreshold = 1,
  }: Slip39Options = {}) {
    this.iterationExponent = iterationExponent;
    this.extendableBackupFlag = extendableBackupFlag;
    this.identifier = identifier;
    this.groupCount = groupCount;
    this.groupThreshold = groupThreshold;
  }

  static fromArray(
    masterSecret: number[],
    {
      passphrase = '',
      threshold = 1,
      groups = [[1, 1, 'Default 1-of-1 group share']],
      iterationExponent = 1,
      extendableBackupFlag = 1,
      title = 'My default slip39 shares',
    }: FromArrayOptions = {}
  ): Slip39 {
    if (masterSecret.length * 8 < MIN_ENTROPY_BITS) {
      throw Error(
        `The length of the master secret (${
          masterSecret.length
        } bytes) must be at least ${bitsToBytes(MIN_ENTROPY_BITS)} bytes.`
      );
    }

    if (masterSecret.length % 2 !== 0) {
      throw Error('The length of the master secret in bytes must be an even number.');
    }

    if (!/^[\x20-\x7E]*$/.test(passphrase)) {
      throw Error(
        'The passphrase must contain only printable ASCII characters (code points 32-126).'
      );
    }

    if (threshold > groups.length) {
      throw Error(
        `The requested group threshold (${threshold}) must not exceed the number of groups (${groups.length}).`
      );
    }

    groups.forEach(item => {
      // Note: 1-of-N shares are technically valid and supported by hardware wallets
      // The original restriction has been removed to match hardware wallet behavior
      if (item[0] <= 0 || item[1] <= 0) {
        throw Error(
          `Invalid group configuration: threshold (${item[0]}) and share count (${item[1]}) must be positive integers.`
        );
      }
      if (item[0] > item[1]) {
        throw Error(
          `Invalid group configuration: threshold (${item[0]}) cannot exceed share count (${item[1]}).`
        );
      }
    });

    const identifier = generateIdentifier();

    const slip = new Slip39({
      iterationExponent,
      extendableBackupFlag,
      identifier,
      groupCount: groups.length,
      groupThreshold: threshold,
    });

    const encryptedMasterSecret = crypt(
      masterSecret,
      passphrase,
      iterationExponent,
      slip.identifier,
      extendableBackupFlag
    );

    const root = slip.buildRecursive(
      new Slip39Node(0, title),
      groups,
      encryptedMasterSecret,
      threshold
    );

    slip.root = root;
    return slip;
  }

  buildRecursive(
    currentNode: Slip39Node,
    nodes: Array<[number, number, string]>,
    secret: number[],
    threshold: number,
    index?: number
  ): Slip39Node {
    // It means it's a leaf.
    if (nodes.length === 0) {
      const mnemonic = encodeMnemonic(
        this.identifier,
        this.extendableBackupFlag,
        this.iterationExponent,
        index || 0,
        this.groupThreshold,
        this.groupCount,
        currentNode.index,
        threshold,
        secret
      );

      currentNode.mnemonic = mnemonic;
      return currentNode;
    }

    const secretShares = splitSecret(threshold, nodes.length, secret);
    let children: Slip39Node[] = [];
    let idx = 0;

    nodes.forEach(item => {
      // n=threshold
      const n = item[0];
      // m=members
      const m = item[1];
      // d=description
      const d = item[2] || '';

      // Generate leaf members, means their `m` is `0`
      const members: Array<[number, number, string]> = Array(m)
        .fill(0)
        .map(() => [n, 0, d]);

      const node = new Slip39Node(idx, d);
      const branch = this.buildRecursive(node, members, secretShares[idx], n, currentNode.index);

      children = children.concat(branch);
      idx += 1;
    });
    currentNode.children = children;
    return currentNode;
  }

  static recoverSecret(mnemonics: string[], passphrase?: string): number[] {
    return combineMnemonics(mnemonics, passphrase);
  }

  static validateMnemonic(mnemonic: string): boolean {
    return validateMnemonic(mnemonic);
  }

  fromPath(path: string): Slip39Node {
    this.validatePath(path);

    const children = this.parseChildren(path);

    if (typeof children === 'undefined' || children.length === 0) {
      return this.root!;
    }

    return children.reduce((prev: Slip39Node, childNumber: number) => {
      const childrenLen = prev.children.length;
      if (childNumber >= childrenLen) {
        throw new Error(
          `The path index (${childNumber}) exceeds the children index (${childrenLen - 1}).`
        );
      }

      return prev.children[childNumber];
    }, this.root!);
  }

  validatePath(path: string): void {
    if (!path.match(/(^r)(\/\d{1,2}){0,2}$/)) {
      throw new Error('Expected valid path e.g. "r/0/0".');
    }

    const depth = path.split('/');
    const pathLength = depth.length - 1;
    if (pathLength > MAX_DEPTH) {
      throw new Error(`Path's (${path}) max depth (${MAX_DEPTH}) is exceeded (${pathLength}).`);
    }
  }

  parseChildren(path: string): number[] {
    const splitted = path.split('/').slice(1);

    const result = splitted.map((pathFragment: string) => parseInt(pathFragment));
    return result;
  }
}

export default Slip39;
export { Slip39Node };
export type { Slip39Options, FromArrayOptions };
