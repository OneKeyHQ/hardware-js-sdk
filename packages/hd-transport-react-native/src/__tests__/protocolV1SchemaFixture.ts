const protocolV1Schema = {
  nested: {
    Initialize: {
      fields: {
        session_id: { type: 'bytes', id: 1 },
        derive_cardano: { type: 'bool', id: 3 },
      },
    },
    GetFeatures: { fields: {} },
    Success: {
      fields: {
        message: { type: 'string', id: 1 },
      },
    },
    Ping: {
      fields: {
        message: { type: 'string', id: 1 },
        button_protection: { type: 'bool', id: 2 },
      },
    },
    FirmwareUpload: {
      fields: {
        payload: { rule: 'required', type: 'bytes', id: 1 },
        hash: { type: 'bytes', id: 2 },
      },
    },
    MessageType: {
      values: {
        MessageType_Initialize: 0,
        MessageType_Ping: 1,
        MessageType_Success: 2,
        MessageType_FirmwareUpload: 7,
        MessageType_GetFeatures: 55,
      },
    },
  },
};

export default protocolV1Schema;
