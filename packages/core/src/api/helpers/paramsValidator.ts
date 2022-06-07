import BigNumber from 'bignumber.js';

import { ERRORS } from '../../constants';
import { addHexPrefix, isHexString } from './hexUtils';

export type SchemaParam = {
  name: string;
  type?:
    | 'string'
    | 'number'
    | 'boolean'
    | 'bigNumber'
    | 'buffer'
    | 'object'
    | 'array'
    | 'hexString';
  required?: boolean;
  allowEmpty?: boolean;
};

const invalidParameter = (message: string) => ERRORS.TypedError('Method_InvalidParameter', message);

export const validateParams = (values: any, fields: Array<SchemaParam>): void => {
  fields.forEach(field => {
    const existsProp = Object.prototype.hasOwnProperty.call(values, field.name);

    if (!existsProp && field.required) {
      throw invalidParameter(`Missing required parameter: ${field.name}`);
    }

    const value = values[field.name];
    if (value && field.type) {
      switch (field.type) {
        case 'array':
          if (!Array.isArray(value)) {
            // invalid type
            throw invalidParameter(
              `Parameter [${field.name}] is of type invalid and should be [${field.type}].`
            );
          } else if (!field.allowEmpty && value.length < 1) {
            throw invalidParameter(`Parameter "${field.name}" is empty.`);
          }
          break;

        case 'bigNumber':
          if (typeof value !== 'string') {
            throw invalidParameter(
              `Parameter [${field.name}] is of type invalid and should be [string].`
            );
          }
          try {
            const bn = new BigNumber(value);
            if (bn.toFixed(0) !== value) {
              // Try catch collection error
              throw new Error('');
            }
          } catch (error) {
            throw invalidParameter(
              `Parameter [${field.name}] is of type invalid and should be [${field.type}].`
            );
          }
          break;

        case 'buffer':
          if (
            typeof value === 'undefined' ||
            (typeof value.constructor.isBuffer === 'function' && value.constructor.isBuffer(value))
          ) {
            throw invalidParameter(
              `Parameter [${field.name}] is of type invalid and should be [buffer].`
            );
          }
          break;

        case 'hexString':
          if (typeof value !== 'string' || !isHexString(addHexPrefix(value))) {
            throw invalidParameter(
              `Parameter [${field.name}] is of type invalid and should be [${field.type}].`
            );
          }
          break;

        default:
          // eslint-disable-next-line valid-typeof
          if (typeof value !== field.type) {
            // invalid type
            throw invalidParameter(
              `Parameter [${field.name}] is of type invalid and should be [${field.type}].`
            );
          }
          break;
      }
    }
  });
};
