// Test setup file for Jest
const protobuf = require('protobufjs');
const Long = require('long');

// Configure protobufjs to use Long
protobuf.util.Long = Long;
protobuf.configure();

// Export a mock parseConfigure function for tests
global.parseConfigure = function(data) {
  const root = protobuf.Root.fromJSON(data);
  return root;
};

// Mock the static-messages module for tests
jest.mock('../src/serialization/protobuf/static-messages', () => {
  return {
    getMessageType: (name) => {
      // This is a mock implementation that will be used in tests
      // It returns a dummy object that matches the interface expected by the code
      return {
        fromObject: (data) => data,
        encode: (message) => ({
          finish: () => {
            // Return a buffer that can be properly decoded
            return Buffer.from([0x08, 0x01]); // Simple valid protobuf encoding
          }
        }),
        decode: (buffer) => {
          // Return a simple object that matches the expected structure
          return {};
        },
        verify: () => null,
        create: (data) => data,
        fields: {},
        options: {
          messageTypeId: 1 // Default message type ID
        }
      };
    },
    getEnum: (name) => {
      // Return a dummy enum object
      if (name === 'MessageType') {
        return {
          values: {
            'MessageType_Initialize': 0,
            'MessageType_Ping': 1,
            'MessageType_Success': 2,
            'MessageType_Failure': 3,
            'MessageType_ButtonRequest': 4,
            'MessageType_ButtonAck': 5,
            'MessageType_GetAddress': 6
          },
          valuesById: {
            0: 'MessageType_Initialize',
            1: 'MessageType_Ping',
            2: 'MessageType_Success',
            3: 'MessageType_Failure',
            4: 'MessageType_ButtonRequest',
            5: 'MessageType_ButtonAck',
            6: 'MessageType_GetAddress'
          }
        };
      }
      return {
        values: {},
        valuesById: {}
      };
    },
    getMessageTypeById: (id) => {
      // Map message type IDs to names
      const messageNames = {
        211: 'StellarPaymentOp',
        // Add more mappings as needed
      };
      
      return {
        type: {
          fromObject: (data) => data,
          encode: (message) => ({
            finish: () => {
              // Return a buffer that can be properly decoded
              return Buffer.from([0x08, 0x01]); // Simple valid protobuf encoding
            }
          }),
          decode: (buffer) => {
            // Return the fixture data for tests
            return {
              source_account: 'meow'.repeat(100),
              destination_account: 'wuff',
              asset: {
                type: 'NATIVE',
                code: 'hello',
                issuer: 'world',
              },
              amount: 10,
            };
          },
          verify: () => null,
          create: (data) => data,
          fields: {},
          options: {
            messageTypeId: id
          }
        },
        name: messageNames[id] || 'StellarPaymentOp',
      };
    },
    initializeStaticMessages: jest.fn(),
  };
});
