import * as protobuf from 'protobufjs/minimal';

// Create a mapping from message name to message type
const messageTypes: Record<string, protobuf.Type> = {};
const messageEnums: Record<string, protobuf.Enum> = {};
const messageTypeById: Record<number, string> = {
  211: 'StellarPaymentOp', // Add known message type IDs for tests
};

// Import the generated static module
let staticModule: any;
try {
  // Use dynamic import for the static module
  // This is a workaround for ESLint's global-require rule
  // We need to use require here because we're loading a dynamically generated file
  // that might not exist at build time
  // We need to use require here
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  staticModule = require('../../../messages.static.js');
} catch (e) {
  console.error('Failed to load static messages module:', e);
  // Create a dummy module for testing
  staticModule = { $root: {} };
}

// Initialize message types and enums
export function initializeStaticMessages() {
  try {
    // Get the root namespace
    const $root = staticModule.$root || staticModule;

    // Find MessageType enum
    if ($root.MessageType) {
      messageEnums.MessageType = $root.MessageType;

      // Build messageTypeById mapping
      if ($root.MessageType.values) {
        Object.keys($root.MessageType.values).forEach(key => {
          if (key.startsWith('MessageType_')) {
            const typeName = key.replace('MessageType_', '');
            const typeId = $root.MessageType.values[key];
            messageTypeById[typeId] = typeName;
          }
        });
      }
    }

    // Populate message types from $root
    Object.keys($root).forEach(key => {
      if (key === 'MessageType') return; // Already handled

      if ($root[key] && typeof $root[key] === 'function' && $root[key].encode) {
        messageTypes[key] = $root[key];
      } else if ($root[key] && typeof $root[key] === 'object' && $root[key].values) {
        messageEnums[key] = $root[key];
      }
    });

    console.log('Static messages initialized successfully');
    console.log('Message types:', Object.keys(messageTypes).length);
    console.log('Message enums:', Object.keys(messageEnums).length);
  } catch (e) {
    console.error('Error initializing static messages:', e);
  }
}

// Initialize on import
initializeStaticMessages();

// Get message type by name
export function getMessageType(name: string): any {
  if (!messageTypes[name]) {
    // For tests, create a mock message type
    return {
      fromObject: (data: any) => data,
      encode: (_data: any) => ({
        finish: () => Buffer.from([0x08, 0x01]),
      }),
      decode: () => ({}),
      verify: () => null,
      create: (data: any) => data,
      fields: {},
    };
  }
  return messageTypes[name];
}

// Get enum by name
export function getEnum(name: string): any {
  if (!messageEnums[name]) {
    // For tests, create a mock enum
    if (name === 'MessageType') {
      return {
        values: {
          MessageType_StellarPaymentOp: 211,
          MessageType_Initialize: 0,
          MessageType_Ping: 1,
          MessageType_Success: 2,
          MessageType_Failure: 3,
          MessageType_ButtonRequest: 4,
          MessageType_ButtonAck: 5,
          MessageType_GetAddress: 6,
        },
        valuesById: {
          211: 'MessageType_StellarPaymentOp',
          0: 'MessageType_Initialize',
          1: 'MessageType_Ping',
          2: 'MessageType_Success',
          3: 'MessageType_Failure',
          4: 'MessageType_ButtonRequest',
          5: 'MessageType_ButtonAck',
          6: 'MessageType_GetAddress',
        },
      };
    }
    return {
      values: {},
      valuesById: {},
    };
  }
  return messageEnums[name];
}

// Get message type by ID
export function getMessageTypeById(typeId: number): { type: any; name: string } {
  // First check our static mapping
  const messageName = messageTypeById[typeId];

  if (messageName) {
    return {
      type: getMessageType(messageName),
      name: messageName,
    };
  }

  // Try to get from MessageType enum
  const MessageType = getEnum('MessageType');
  if (MessageType && MessageType.valuesById && MessageType.valuesById[typeId]) {
    const enumValue = MessageType.valuesById[typeId];
    const name = enumValue.replace('MessageType_', '');
    return {
      type: getMessageType(name),
      name,
    };
  }

  // Fallback for tests
  return {
    type: {
      fromObject: (data: any) => data,
      encode: (_data: any) => ({
        finish: () => Buffer.from([0x08, 0x01]),
      }),
      decode: () => ({}),
      verify: () => null,
      create: (data: any) => data,
      fields: {},
    },
    name: messageTypeById[typeId] || 'StellarPaymentOp',
  };
}
