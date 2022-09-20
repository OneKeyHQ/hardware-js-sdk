import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { validatePath, serializedPath } from './helpers/pathUtils';

export default class BatchGetPublicKey extends BaseMethod {
  init() {
    this.checkDeviceId = true;
    validateParams(this.payload, [
      { name: 'paths', type: 'array' },
      { name: 'ecdsaCurveName', type: 'string' },
    ]);

    this.params = this.payload.paths.map((path: string) => {
      const addressN = validatePath(path, 1);
      return { address_n: addressN };
    });
  }

  async run() {
    // @ts-expect-error
    const res = await this.device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', {
      paths: this.params,
      ecdsa_curve_name: this.payload.ecdsaCurveName ?? 'secp256k1',
    });
    // @ts-expect-error
    const result = res.message.public_keys.map((publicKey: string, index: number) => ({
      path: serializedPath((this.params as unknown as any[])[index].address_n),
      publicKey,
    }));
    return Promise.resolve(result);
  }
}
