import BigNumber from 'bignumber.js';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { SchemaParam, validateParams } from '../helpers/paramsValidator';
import { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from '../../types';
import { formatAnyHex, stripHexStartZeroes } from '../helpers/hexUtils';

export type EVMSignTypedDataParams = {
  addressN: number[];
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
};

export default class EVMSignSafeTx extends BaseMethod<EVMSignTypedDataParams> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'data', type: 'object' },
    ]);

    const { path, data } = this.payload;

    const addressN = validatePath(path, 3);

    // check if transaction is valid
    const schema: SchemaParam[] = [
      { name: 'to', type: 'hexString', required: true },
      { name: 'value', type: 'string', required: true },
      { name: 'data', type: 'hexString' },
      { name: 'operation', type: 'string', required: true },
      { name: 'safeTxGas', type: 'string', required: true },
      { name: 'baseGas', type: 'string', required: true },
      { name: 'gasPrice', type: 'string', required: true },
      { name: 'gasToken', type: 'hexString', required: true },
      { name: 'refundReceiver', type: 'hexString', required: true },
      { name: 'nonce', type: 'string', required: true },
    ];

    validateParams(data.message, schema);

    const schemaDomain: SchemaParam[] = [
      { name: 'chainId', type: 'hexString', required: true },
      { name: 'verifyingContract', type: 'hexString', required: true },
    ];

    validateParams(data.domain, schemaDomain);

    this.params = {
      addressN,
      data,
    };
  }

  async run() {
    const { addressN, data } = this.params;
    const param = {
      address_n: addressN,
      to: data.message.to,
      value: formatAnyHex(new BigNumber(data.message.value).toString(16)),
      data: stripHexStartZeroes(formatAnyHex(data.message.data)),
      operation: parseInt(data.message.operation),
      safeTxGas: formatAnyHex(new BigNumber(data.message.safeTxGas).toString(16)),
      baseGas: formatAnyHex(new BigNumber(data.message.baseGas).toString(16)),
      gasPrice: formatAnyHex(new BigNumber(data.message.gasPrice).toString(16)),
      gasToken: data.message.gasToken,
      refundReceiver: data.message.refundReceiver,
      nonce: formatAnyHex(new BigNumber(data.message.nonce).toString(16)),
      chain_id: new BigNumber(data.domain.chainId ?? '0x', 16).toNumber(),
      verifyingContract: data.domain.verifyingContract,
    };

    return this.device.commands.typedCall(
      'EthereumGnosisSafeTxRequest',
      'EthereumGnosisSafeSignature',
      param
    );
  }
}
