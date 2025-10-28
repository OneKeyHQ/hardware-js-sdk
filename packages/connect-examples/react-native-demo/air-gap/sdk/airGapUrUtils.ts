import { decodeToDataItem } from '@keystonehq/bc-ur-registry';

import { AirGapUR, AirGapURDecoder, AirGapUREncoder } from './AirGapUR';

import type { IAirGapUrJson } from './AirGapUR';

function decodeUrToDataItem(cbor: string) {
  const cborBuffer = Buffer.from(cbor, 'hex');
  return decodeToDataItem(cborBuffer);
}

function urToJson({ ur }: { ur?: AirGapUR }): IAirGapUrJson {
  const cbor = ur ? ur.cbor.toString('hex') : '';
  const type = ur ? ur.type : '';
  return {
    type,
    cbor,
  };
}

function jsonToUr({ ur }: { ur: IAirGapUrJson | AirGapUR }): AirGapUR {
  if (ur instanceof AirGapUR) {
    return ur;
  }
  return new AirGapUR(Buffer.from(ur.cbor, 'hex'), ur.type);
}

function createAnimatedURDecoder() {
  const decoder = new AirGapURDecoder();
  let receivePart: ((data: string) => void) | undefined;
  let abort = () => undefined;
  const promiseResultUR = new Promise<AirGapUR>((resolve, reject) => {
    abort = () => {
      reject(new Error('AnimatedURDecode aborted'));
    };
    receivePart = (data: string) => {
      decoder.receivePart(data);
      if (decoder.isComplete()) {
        resolve(decoder.resultUR());
      }
    };
  });

  return {
    decoder,
    receivePart,
    abort,
    promiseResultUR,
  };
}

function createAnimatedUREncoder({
  ur,
  maxFragmentLength,
  firstSeqNum,
  minFragmentLength,
}: {
  ur: AirGapUR | IAirGapUrJson;
  maxFragmentLength?: number;
  firstSeqNum?: number;
  minFragmentLength?: number;
}): {
  encoder: AirGapUREncoder;
  nextPart: () => string;
  encodeWhole: () => string[];
} {
  const normalizedUr = jsonToUr({ ur });
  const encoder = new AirGapUREncoder(
    normalizedUr,
    maxFragmentLength,
    firstSeqNum,
    minFragmentLength
  );
  const nextPart = encoder.nextPart.bind(encoder);
  const encodeWhole = encoder.encodeWhole.bind(encoder);

  const nextPartToUpperCase = () => nextPart().toUpperCase();
  const encodeWholeToUpperCase = () => encodeWhole().map((part: string) => part.toUpperCase());

  return {
    encoder,
    nextPart: nextPartToUpperCase,
    encodeWhole: encodeWholeToUpperCase,
  };
}

function qrcodeToUr(qrcode: string | string[]): Promise<AirGapUR> {
  const decoder = createAnimatedURDecoder();
  let payload: string[] = [];
  if (typeof qrcode === 'string') {
    payload = qrcode
      .trim()
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  } else {
    payload = [...qrcode];
  }
  for (const part of payload) {
    const data = part.trim();
    if (data) {
      decoder.receivePart?.(data);
    }
  }
  return decoder.promiseResultUR;
}

function urToQrcode(ur: AirGapUR | IAirGapUrJson): {
  allParts: string[];
  single: string;
} {
  const normalizedUr = jsonToUr({ ur });
  const encoder = createAnimatedUREncoder({
    ur: normalizedUr,
    maxFragmentLength: 100,
    firstSeqNum: 0,
  });
  const allParts = encoder.encodeWhole();
  const single = AirGapUREncoder.encodeSinglePart(normalizedUr).toUpperCase();
  return {
    allParts,
    single,
  };
}

export default {
  decodeUrToDataItem,
  createAnimatedURDecoder,
  createAnimatedUREncoder,
  urToJson,
  jsonToUr,
  qrcodeToUr,
  urToQrcode,
};
