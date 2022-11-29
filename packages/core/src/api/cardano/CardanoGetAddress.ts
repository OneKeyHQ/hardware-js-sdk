import { BaseMethod } from '../BaseMethod';
import { PROTO } from '../../constants';
import { UI_REQUEST } from '../../constants/ui-request';
import { validateParams } from '../helpers/paramsValidator';
import {
  validateAddressParameters,
  addressParametersToProto,
  addressParametersFromProto,
} from './helper/addressParameters';
import { serializedPath } from '../helpers/pathUtils';
import { CardanoGetAddressParams, CardanoAddress } from '../../types/api/cardanoGetAddress';

export default class CardanoGetAddress extends BaseMethod<CardanoGetAddressParams[]> {
  hasBundle?: boolean;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    this.params = payload.bundle.map((batch: any) => {
      // validate incoming parameters for each batch
      validateParams(batch, [
        { name: 'addressParameters', type: 'object', required: true },
        { name: 'networkId', type: 'number', required: true },
        { name: 'protocolMagic', type: 'number', required: true },
        { name: 'derivationType', type: 'number' },
        { name: 'address', type: 'string' },
        { name: 'showOnTrezor', type: 'boolean' },
      ]);

      validateAddressParameters(batch.addressParameters);

      return {
        address_parameters: addressParametersToProto(batch.addressParameters),
        address: batch.address,
        protocol_magic: batch.protocolMagic,
        network_id: batch.networkId,
        derivation_type:
          typeof batch.derivationType !== 'undefined'
            ? batch.derivationType
            : PROTO.CardanoDerivationType.ICARUS_TREZOR,
        show_display: typeof batch.showOnOneKey === 'boolean' ? !!batch.showOneKey : true,
      };
    });
  }

  async run() {
    const responses: CardanoAddress[] = [];

    for (const batch of this.params) {
      const { address_parameters, protocol_magic, network_id, derivation_type, show_display } =
        batch;
      const response = await this.device.commands.typedCall('CardanoGetAddress', 'CardanoAddress', {
        address_parameters,
        protocol_magic,
        network_id,
        derivation_type,
        show_display,
      });

      responses.push({
        addressParameters: addressParametersFromProto(batch.address_parameters),
        protocolMagic: batch.protocol_magic,
        networkId: batch.network_id,
        serializedPath: serializedPath(batch.address_parameters.address_n),
        serializedStakingPath: serializedPath(batch.address_parameters.address_n_staking),
        address: response.message.address,
      });
    }

    return this.hasBundle ? responses : responses[0];
  }
}
