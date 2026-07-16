import { encodeData, getFieldType, intToHex, parseArrayType } from '../eip712';

describe('eip712 helpers', () => {
  describe('intToHex', () => {
    test('uint8: zero, max, and out-of-range', () => {
      expect(intToHex(0, 1, false)).toBe('00');
      expect(intToHex(255, 1, false)).toBe('ff');
      expect(() => intToHex(256, 1, false)).toThrow(/out of range/);
      expect(() => intToHex(-1, 1, false)).toThrow(/out of range/);
    });

    test('int8: range [-128, 127], rejects out-of-range BEFORE wrap', () => {
      expect(intToHex(0, 1, true)).toBe('00');
      expect(intToHex(127, 1, true)).toBe('7f');
      expect(intToHex(-1, 1, true)).toBe('ff'); // two's complement
      expect(intToHex(-128, 1, true)).toBe('80');
      // Regression: -129 used to silently wrap to 0x7f (in-range AFTER wrap).
      expect(() => intToHex(-129, 1, true)).toThrow(/out of range/);
      expect(() => intToHex(128, 1, true)).toThrow(/out of range/);
    });

    test('uint256: accepts decimal strings, hex strings, and bigints', () => {
      expect(intToHex('1000000000000000000', 32, false)).toBe(
        '0000000000000000000000000000000000000000000000000de0b6b3a7640000'
      );
      expect(intToHex('0x0de0b6b3a7640000', 32, false)).toBe(
        '0000000000000000000000000000000000000000000000000de0b6b3a7640000'
      );
      // 2^200 = "1" followed by 50 hex zeros; padded with 13 leading zeros to 32 bytes
      expect(intToHex(1n << 200n, 32, false)).toBe(`00000000000001${'0'.repeat(50)}`);
    });

    test('booleans encode as 1/0', () => {
      expect(intToHex(true, 1, false)).toBe('01');
      expect(intToHex(false, 1, false)).toBe('00');
    });
  });

  describe('encodeData', () => {
    test('string is UTF-8 hex', () => {
      expect(encodeData('string', 'Alice')).toBe('416c696365');
      expect(encodeData('string', '')).toBe('');
    });

    test('address strips 0x and preserves case', () => {
      expect(encodeData('address', '0x1111111111111111111111111111111111111111')).toBe(
        '1111111111111111111111111111111111111111'
      );
    });

    test('bool encodes as 01/00', () => {
      expect(encodeData('bool', true)).toBe('01');
      expect(encodeData('bool', false)).toBe('00');
    });

    test('uint16 array-length use case', () => {
      expect(encodeData('uint16', 2)).toBe('0002');
      expect(encodeData('uint16', 65535)).toBe('ffff');
    });

    test('rejects unsupported types', () => {
      expect(() => encodeData('Mail', {})).toThrow(/unsupported atomic type/);
    });
  });

  describe('parseArrayType', () => {
    test('dynamic array', () => {
      expect(parseArrayType('uint256[]')).toEqual({ entryTypeName: 'uint256', arraySize: null });
    });

    test('fixed-size array', () => {
      expect(parseArrayType('address[3]')).toEqual({ entryTypeName: 'address', arraySize: 3 });
    });

    test('nested array peels one level', () => {
      // Foo[][] → Foo[] (caller recurses)
      expect(parseArrayType('Foo[][]')).toEqual({ entryTypeName: 'Foo[]', arraySize: null });
    });

    test('rejects non-arrays', () => {
      expect(() => parseArrayType('uint256')).toThrow(/not an EIP-712 array/);
    });
  });

  describe('getFieldType', () => {
    const types = {
      EIP712Domain: [],
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' },
      ],
    };

    test('atomic types', () => {
      expect(getFieldType('string', types)).toEqual({ data_type: 4 });
      expect(getFieldType('bool', types)).toEqual({ data_type: 5 });
      expect(getFieldType('address', types)).toEqual({ data_type: 6 });
    });

    test('uint/int with bit size', () => {
      expect(getFieldType('uint256', types)).toEqual({ data_type: 1, size: 32 });
      expect(getFieldType('int8', types)).toEqual({ data_type: 2, size: 1 });
    });

    test('bytes: fixed-size vs dynamic', () => {
      expect(getFieldType('bytes32', types)).toEqual({ data_type: 3, size: 32 });
      expect(getFieldType('bytes', types)).toEqual({ data_type: 3, size: undefined });
    });

    test('struct reference', () => {
      expect(getFieldType('Person', types)).toEqual({
        data_type: 8,
        size: 2,
        struct_name: 'Person',
      });
    });

    test('array recurses into entry type', () => {
      expect(getFieldType('Person[]', types)).toEqual({
        data_type: 7,
        size: undefined,
        entry_type: { data_type: 8, size: 2, struct_name: 'Person' },
      });
    });

    test('unknown struct throws', () => {
      expect(() => getFieldType('Unknown', types)).toThrow(/not defined/);
    });
  });
});
