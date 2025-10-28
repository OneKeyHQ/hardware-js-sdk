declare module 'bs58check' {
  export function decode(input: string | Buffer): Buffer;
  export function encode(payload: Buffer): string;
}
