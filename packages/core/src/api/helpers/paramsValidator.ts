import BigNumber from 'bignumber.js';

import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { addHexPrefix, isHexString } from './hexUtils';

export type SchemaParam = {
  name: string;
  type?:
    | 'string'
    | 'number'
    | 'boolean'
    | 'bigNumber'
    | 'uint'
    | 'buffer'
    | 'object'
    | 'array'
    | 'hexString';
  required?: boolean;
  allowEmpty?: boolean;
  allowNegative?: boolean;
};

const invalidParameter = (message: string) =>
  ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter, message);

const invalidResponse = (message: string) =>
  ERRORS.TypedError(HardwareErrorCode.CallMethodError, message);

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
        case 'uint':
          if (typeof value !== 'string' && typeof value !== 'number') {
            throw invalidParameter(
              `Parameter [${field.name}] has invalid type. "string|number" expected.`
            );
          }
          if (
            (typeof value === 'number' && !Number.isSafeInteger(value)) ||
            !/^(?:[1-9]\d*|\d)$/.test(
              value.toString().replace(/^-/, field.allowNegative ? '' : '-')
            )
          ) {
            throw invalidParameter(
              `Parameter [${field.name}] has invalid value "${value}". Integer representation expected.`
            );
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

export function validateResult(
  result: any,
  nonNullableFields: string[],
  options?: {
    expectedLength?: number | undefined | null;
  }
) {
  console.log('=====>>>>> validateResult', result, nonNullableFields, options);

  if (Array.isArray(result)) {
    if (options?.expectedLength !== null && result.length !== options?.expectedLength) {
      throw invalidResponse(
        `Expected array length of ${options?.expectedLength}, but got ${result.length}`
      );
    }
    result.forEach((item, index) => {
      nonNullableFields.forEach(field => {
        if (item[field] == null) {
          throw invalidResponse(`Field '${field}' in array item at index ${index} is null`);
        }
      });
    });
  } else if (typeof result === 'object' && result !== null) {
    nonNullableFields.forEach(field => {
      if (result[field] == null) {
        throw invalidResponse(`Field '${field}' in object is null`);
      }
    });
  } else {
    throw invalidResponse('Result is neither an array nor a valid object');
  }
}
