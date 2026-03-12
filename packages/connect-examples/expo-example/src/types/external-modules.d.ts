declare module '@onekeyfe/hd-common-connect-sdk' {
  const sdk: any;
  export default sdk;
}

declare module '@nexajs/address' {
  export function encodeAddress(
    prefix: string,
    type: string,
    payload: Uint8Array | Buffer
  ): string;
}

declare module '@nexajs/script' {
  export const OP: Record<string, number>;
  export function encodeDataPush(data: Uint8Array): Uint8Array;
}
