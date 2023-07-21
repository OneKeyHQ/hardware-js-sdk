import { EthereumVerifyMessageOneKey, Success, TypedCall } from '@onekeyfe/hd-transport';
import { Device } from '../../../device/Device';

export default async function ({
  typedCall,
  params,
  supportTrezor,
}: {
  typedCall: TypedCall;
  params: EthereumVerifyMessageOneKey;
  supportTrezor: boolean;
  device: Device;
}): Promise<Success> {
  let res;
  if (supportTrezor) {
    res = await typedCall('EthereumVerifyMessage', 'Success', {
      signature: params.signature,
      message: params.message,
      address: params.address,
    });
  } else {
    res = await typedCall('EthereumVerifyMessageOneKey', 'Success', {
      ...params,
    });
  }

  return Promise.resolve(res.message);
}
