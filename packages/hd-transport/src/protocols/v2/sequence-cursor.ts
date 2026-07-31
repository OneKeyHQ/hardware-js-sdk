import { nextProtoSeq } from './encode';

export class ProtocolV2SequenceCursor {
  private current = 0;

  next(): number {
    this.current = nextProtoSeq(this.current);
    return this.current;
  }
}
