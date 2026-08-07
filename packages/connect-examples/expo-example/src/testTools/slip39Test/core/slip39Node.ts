// SLIP39 Node class
/* eslint-disable no-useless-constructor, no-empty-function */

/**
 * Slip39Node
 * For root node, description refers to the whole set's title e.g. "Hardware wallet X SSSS shares"
 * For children nodes, description refers to the group e.g. "Family group: mom, dad, sister, wife"
 */
export class Slip39Node {
  public index: number;

  public description: string;

  public mnemonic: string;

  public children: Slip39Node[];

  constructor(index = 0, description = '', mnemonic = '', children: Slip39Node[] = []) {
    this.index = index;
    this.description = description;
    this.mnemonic = mnemonic;
    this.children = children;
  }

  get mnemonics(): string[] {
    if (this.children.length === 0) {
      return [this.mnemonic];
    }
    const result = this.children.reduce(
      (prev: string[], item: Slip39Node) => prev.concat(item.mnemonics),
      []
    );
    return result;
  }
}
