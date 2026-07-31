const {
  createMessageFromName,
  createMessageFromType,
  parseConfigure,
} = require('../src/serialization/protobuf/messages');
const v1Messages = require('../../core/src/data/messages/messages.json');
const v2Messages = require('../messages-protocol-v2.json');
const coreV2Messages = require('../../core/src/data/messages/messages-protocol-v2.json');
const generatedTypes = require('../src/types/messages');

// const json = require('./data/messages.json');

const json = {
  nested: {
    Initialize: {
      fields: {
        session_id: {
          type: 'bytes',
          id: 1,
        },
        _skip_passphrase: {
          type: 'bool',
          id: 2,
          options: {
            deprecated: true,
          },
        },
        derive_cardano: {
          type: 'bool',
          id: 3,
        },
      },
    },
    TxAckInput: {
      options: {
        '(wire_type)': 22,
      },
      fields: {
        tx: {
          rule: 'required',
          type: 'TxAckInputWrapper',
          id: 1,
        },
      },
      nested: {
        TxAckInputWrapper: {
          fields: {
            input: {
              rule: 'required',
              type: 'TxInput',
              id: 2,
            },
          },
        },
      },
    },
    MessageType: {
      values: {
        MessageType_Initialize: 0,
      },
    },
  },
};

describe('messages', () => {
  test('V1 GetPassphraseState matches the current firmware schema', () => {
    const { fields } = v1Messages.nested.GetPassphraseState;

    expect(fields.passphrase_state).toMatchObject({ id: 1, type: 'string' });
    expect(fields).not.toHaveProperty('_only_main_pin');
    expect(fields).not.toHaveProperty('allow_create_attach_pin');
  });

  test('Protocol V2 firmware targets match the current firmware-pro2 enum', () => {
    expect(v2Messages.nested.DeviceFirmwareTargetType.values).toEqual({
      FW_MGMT_TARGET_INVALID: 0,
      FW_MGMT_TARGET_CRATE: 1,
      FW_MGMT_TARGET_ROMLOADER: 2,
      FW_MGMT_TARGET_BOOTLOADER: 3,
      FW_MGMT_TARGET_APPLICATION_P1: 4,
      FW_MGMT_TARGET_APPLICATION_P2: 5,
      FW_MGMT_TARGET_COPROCESSOR: 6,
      FW_MGMT_TARGET_SE01: 7,
      FW_MGMT_TARGET_SE02: 8,
      FW_MGMT_TARGET_SE03: 9,
      FW_MGMT_TARGET_SE04: 10,
    });
  });

  test('Protocol V2 conflicting enums keep their own wire values', () => {
    expect(generatedTypes.ProtocolV2FailureType).toMatchObject({
      Failure_DataError: 4,
      Failure_ProcessError: 5,
    });
    expect(generatedTypes.Enum_ProtocolV2Capability).toMatchObject({
      Capability_AttachToPin: 18,
    });
  });

  test('Protocol V2 device status and session messages match firmware-pro2', () => {
    expect(v2Messages.nested.MessageType.values).toMatchObject({
      MessageType_DeviceStatusGet: 60602,
      MessageType_DeviceStatus: 60603,
      MessageType_DeviceSessionGet: 61200,
      MessageType_DeviceSession: 61201,
      MessageType_DeviceSessionAskPin: 61202,
      MessageType_DeviceSessionAskPassphrase: 61203,
    });
    expect(v2Messages.nested.DeviceStatusGet).toEqual({ fields: {} });
    expect(v2Messages.nested.ProtocolInfoRequest.fields.eventless_wallet_session).toMatchObject({
      id: 1,
      type: 'bool',
      options: { default: false },
    });
    expect(v2Messages.nested.ProtocolInfo.fields).toMatchObject({
      version: { id: 1, type: 'uint32', rule: 'required' },
      build_fingerprint: { id: 2, type: 'string', rule: 'required' },
      supported_messages: { id: 3, type: 'uint32', rule: 'repeated' },
    });
    expect(v2Messages.nested.DeviceSessionGet.fields.session_id).toMatchObject({
      id: 1,
      type: 'bytes',
    });
    expect(v2Messages.nested.DeviceSessionGet.fields).toMatchObject({
      btc_test_address: { id: 2, type: 'string' },
      seed_domains: {
        id: 3,
        type: 'DeviceSessionSeedDomain',
        rule: 'repeated',
      },
    });
    expect(v2Messages.nested.DeviceSessionSeedDomain.values).toEqual({
      SeedDomain_Standard: 1,
      SeedDomain_Cardano: 2,
    });
    expect(v2Messages.nested.DeviceSessionPinType.values).toEqual({
      Any: 1,
      Main: 2,
      AttachToPin: 3,
    });
    expect(v2Messages.nested.DeviceSessionErrorCode.values).toEqual({
      DeviceSessionError_None: 0,
      DeviceSessionError_UserCancelled: 1,
      DeviceSessionError_InvalidSession: 2,
      DeviceSessionError_AttachPinUnavailable: 3,
      DeviceSessionError_PassphraseDisabled: 4,
      DeviceSessionError_Busy: 5,
    });
    expect(v2Messages.nested).not.toHaveProperty('DeviceWalletSelect');
    expect(v2Messages.nested).not.toHaveProperty('DeviceWalletType');
    expect(v2Messages.nested).not.toHaveProperty('DeviceHiddenWalletSelect');
    expect(v2Messages.nested.DeviceSession.fields).toMatchObject({
      session_id: { id: 1, type: 'bytes' },
      btc_test_address: { id: 2, type: 'string' },
    });
    expect(v2Messages.nested.DeviceSessionAskPin.fields.type).toMatchObject({
      id: 1,
      type: 'DeviceSessionPinType',
    });
    expect(v2Messages.nested.DeviceSessionAskPassphrase).toEqual({
      fields: {
        passphrase: {
          type: 'string',
          id: 1,
        },
        on_device: {
          rule: 'required',
          type: 'bool',
          id: 2,
        },
      },
    });
    expect(v2Messages.nested.DeviceSessionAskPin_FailureSubCodes.values).toEqual({
      UserCancel: 1,
    });
    expect(v2Messages.nested.MessageType.values).not.toHaveProperty(
      'MessageType_DeviceSessionPinResult'
    );
    expect(v2Messages.nested.MessageType.values).not.toHaveProperty(
      'MessageType_DeviceSessionOpen'
    );
  });

  test('Protocol V2 passphrase selection explicitly selects host or device input on wire', () => {
    const messages = parseConfigure(v2Messages);
    const { Message } = createMessageFromName(messages, 'DeviceSessionAskPassphrase');

    const onHost = Message.encode(
      Message.create({ passphrase: 'host hidden wallet', on_device: false })
    ).finish();
    const onDevice = Message.encode(Message.create({ on_device: true })).finish();

    expect(Buffer.from(onHost).toString('hex')).toBe(
      '0a12686f73742068696464656e2077616c6c65741000'
    );
    expect(Buffer.from(onDevice).toString('hex')).toBe('1001');
    expect(Message.decode(onHost)).toMatchObject({
      passphrase: 'host hidden wallet',
      on_device: false,
    });
    expect(Message.decode(onDevice)).toMatchObject({ on_device: true });
  });

  test('Protocol V2 onboarding status matches the current firmware-pro2 schema', () => {
    expect(v2Messages.nested.MessageType.values).toMatchObject({
      MessageType_OnboardingStatusGet: 61600,
      MessageType_OnboardingStatus: 61601,
    });
    expect(v2Messages.nested.OnboardingStep.values).toMatchObject({
      ONBOARDING_STEP_UNKNOWN: 0,
      ONBOARDING_STEP_CHECKING: 1,
      ONBOARDING_STEP_PERSONALIZATION: 2,
      ONBOARDING_STEP_PIN: 3,
      ONBOARDING_STEP_SETUP: 4,
      ONBOARDING_STEP_DONE: 5,
    });
    expect(v2Messages.nested.OnboardingPhase.values).toBeDefined();
    expect(v2Messages.nested.OnboardingSetupKind.values).toBeDefined();
    expect(v2Messages.nested.OnboardingSetupMethod.values).toBeDefined();
    expect(v2Messages.nested.OnboardingSetupStatus.fields).toMatchObject({
      kind: { id: 1, type: 'OnboardingSetupKind' },
      method: { id: 2, type: 'OnboardingSetupMethod' },
    });
    expect(v2Messages.nested.OnboardingStatus.fields).toMatchObject({
      step: { id: 1, type: 'OnboardingStep' },
      phase: { id: 2, type: 'OnboardingPhase' },
      setup: { id: 3, type: 'OnboardingSetupStatus' },
      pin_set: { id: 4, type: 'bool' },
      wallet_initialized: { id: 5, type: 'bool' },
    });
    expect(v2Messages.nested).not.toHaveProperty('DevOnboardingStatus');
  });

  test('Protocol V2 does not restore retired unlock or passphrase ids', () => {
    expect(v2Messages.nested.MessageType.values).not.toHaveProperty('MessageType_UnLockDevice');
    expect(v2Messages.nested.MessageType.values).not.toHaveProperty(
      'MessageType_UnLockDeviceResponse'
    );
    expect(v2Messages.nested.MessageType.values).not.toHaveProperty(
      'MessageType_GetPassphraseState'
    );
    expect(v2Messages.nested.MessageType.values).not.toHaveProperty('MessageType_PassphraseState');
  });

  test('Protocol V2 transport and core schemas stay identical', () => {
    expect(coreV2Messages).toEqual(v2Messages);
  });

  test('createMessageFromName (common case)', () => {
    const messages = parseConfigure(json);
    const name = 'Initialize';

    expect(() => createMessageFromName(messages, name)).not.toThrow();
  });

  test('createMessageFromType (common case)', () => {
    const messages = parseConfigure(json);
    expect(() => createMessageFromType(messages, 0)).not.toThrow();
  });

  test('createMessageFromType throws a readable error for unknown ids', () => {
    const messages = parseConfigure(json);

    expect(() => createMessageFromType(messages, 99999)).toThrow(
      'MessageType id "99999" is not defined in protobuf schema'
    );
  });

  test('createMessageFromName (wire_type case)', () => {
    const messages = parseConfigure(json);
    const name = 'TxAckInput';

    expect(() => createMessageFromName(messages, name)).not.toThrow();
  });

  test('[compatibility]: descriptors as string', () => {
    const messages = parseConfigure(JSON.stringify(json));
    const name = 'TxAckInput';

    expect(() => createMessageFromName(messages, name)).not.toThrow();
  });

  test('createMessageFromName throws when message type id is missing', () => {
    const messages = parseConfigure(json);

    expect(() => createMessageFromName(messages, 'TxAckInputWrapper')).toThrow(
      'MessageType for "TxAckInputWrapper" is not defined in protobuf schema'
    );
  });
});
