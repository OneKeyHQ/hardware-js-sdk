import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Children, isValidElement, useContext, useState } from 'react';
import * as Clipboard from 'expo-clipboard';

import Playground from '../components/Playground';
import PlaygroundExecutor from '../components/PlaygroundExecutor';
import { executeProtocolAwareMethod } from '../utils/protocolAwareMethod';
import {
  acquireEditorParams,
  MAX_EDITABLE_PARAMETER_LENGTH,
  preparePresetEditor,
} from '../utils/presetEditor';

import type { ReactElement, ReactNode } from 'react';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
  useCallback: (callback: unknown) => callback,
  useEffect: jest.fn(),
  useMemo: (factory: () => unknown) => factory(),
  useRef: (current: unknown) => ({ current }),
  useState: jest.fn(),
}));
jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('tamagui', () => ({
  Group: Object.assign(() => null, { Item: () => null }),
  H4: 'heading',
  Stack: 'stack',
  Text: 'text',
}));
jest.mock('../provider/HardwareSDKContext', () => ({ __esModule: true, default: {} }));
jest.mock('../provider/DeviceProvider', () => ({
  useDevice: () => ({
    selectedDevice: {
      connectId: 'test-connect',
      connectProtocol: 'V1',
      features: { deviceId: 'test-device' },
    },
  }),
}));
jest.mock('../provider/CommonParamsProvider', () => ({
  useCommonParams: () => ({ commonParams: {} }),
}));
jest.mock('../provider/ExpandModeProvider', () => ({ useExpandMode: () => true }));
jest.mock('../utils/protocolAwareMethod', () => ({ executeProtocolAwareMethod: jest.fn() }));
jest.mock('../components/ui/Button', () => ({ Button: 'button' }));
jest.mock('../components/ui/AutoWrapperTextArea', () => ({
  __esModule: true,
  default: 'text-area',
}));

type TestElement = ReactElement<{
  children?: ReactNode;
  value?: string;
  editable?: boolean;
  onPress?: () => Promise<void>;
}>;

function collectElements(node: ReactNode): TestElement[] {
  return Children.toArray(node).flatMap(child =>
    isValidElement<TestElement['props']>(child)
      ? [child, ...collectElements(child.props.children)]
      : []
  );
}

const source = readFileSync(resolve(__dirname, 'ApiPayloadScreen.tsx'), 'utf8');
const expandModeSource = readFileSync(
  resolve(__dirname, '../provider/ExpandModeProvider.tsx'),
  'utf8'
);
const playgroundSource = readFileSync(resolve(__dirname, '../components/Playground.tsx'), 'utf8');
const executorSource = readFileSync(
  resolve(__dirname, '../components/PlaygroundExecutor.tsx'),
  'utf8'
);

describe('API Payload screen responsiveness', () => {
  test('uses one full-screen FlatList for the complete page', () => {
    const flatListIndex = source.indexOf('<FlatList');

    expect(source).toContain('<PageView scrollable={false}>');
    expect(source).toContain('style={{ flex: 1 }}');
    expect(source.indexOf('<DeviceList />')).toBeGreaterThan(flatListIndex);
    expect(source.indexOf('<CommonParamsView />')).toBeGreaterThan(flatListIndex);
    expect(source).not.toContain('<DeviceProvider>');
    expect(expandModeSource).toContain('<Stack flex={1}>');
  });

  test('keeps the initial render batch small', () => {
    expect(source).toContain('initialNumToRender={1}');
    expect(source).toContain('maxToRenderPerBatch={1}');
    expect(source).toContain('windowSize={5}');
  });

  test('keeps oversized presets out of the controlled parameter editor', () => {
    const smallPreset = { title: 'small', value: { data: 'x'.repeat(1_000) } };
    const largePreset = {
      title: 'large',
      value: { data: 'x'.repeat(MAX_EDITABLE_PARAMETER_LENGTH) },
    };

    const preparedLargePreset = preparePresetEditor(largePreset);
    expect(preparedLargePreset.isOversized).toBe(true);
    expect(preparedLargePreset.editorValue.length).toBeLessThan(1_000);
    expect(
      acquireEditorParams(preparedLargePreset.editorValue, preparedLargePreset.oversizedPreset)
    ).toBe(largePreset.value);

    const preparedSmallPreset = preparePresetEditor(smallPreset);
    expect(preparedSmallPreset.isOversized).toBe(false);
    expect(preparedSmallPreset.oversizedPreset).toBeNull();
    expect(
      acquireEditorParams(preparedSmallPreset.editorValue, preparedSmallPreset.oversizedPreset)
    ).toEqual(smallPreset.value);
    expect(acquireEditorParams('{', null)).toEqual({});

    expect(playgroundSource).toContain('editable={!hasOversizedPreset}');
    expect(playgroundSource).toContain('oversizedPresetRef.current = null');
    expect(executorSource).not.toContain("console.log('requestParams: ', requestParams)");
    expect(executorSource).not.toMatch(/console\.(?:log|info)\([^;]*params:\s*requestParams/u);
  });
});

describe('API Payload response redaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useContext).mockReturnValue({ sdk: {} });
  });

  test('masks the derived secret in both the response field and clipboard', async () => {
    const secret = '00'.repeat(32);
    const sdkResponse = { success: true, payload: { secret } };
    jest.mocked(executeProtocolAwareMethod).mockResolvedValue(sdkResponse);
    const onExecute = jest.fn();
    const [executeButton] = collectElements(
      PlaygroundExecutor({
        methodPayload: { method: 'btcDeriveContextHash' },
        onAcquireParams: () => Promise.resolve({}),
        onExecute,
      })
    );
    if (!executeButton.props.onPress) throw new Error('Missing execution button');
    await executeButton.props.onPress();

    expect(onExecute).toHaveBeenCalledTimes(1);
    const response: string = onExecute.mock.calls[0][0];
    jest
      .mocked(useState)
      .mockReturnValueOnce([false, jest.fn()])
      .mockReturnValueOnce(['', jest.fn()])
      .mockReturnValueOnce([false, jest.fn()])
      .mockReturnValueOnce([response, jest.fn()]);
    const elements = collectElements(Playground({ method: 'btcDeriveContextHash' }));
    const responseField = elements.find(
      element => element.type === 'text-area' && element.props.value === response
    );
    const copyButton = elements.find(element => element.type === 'button');
    if (!responseField || !copyButton?.props.onPress) throw new Error('Missing response UI');

    expect(responseField.props.editable).toBe(false);
    expect(JSON.parse(responseField.props.value ?? '')).toEqual({
      success: true,
      payload: { secret: '[Redacted]' },
    });
    await copyButton.props.onPress();
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(response);
    expect(response).not.toContain(secret);
    expect(sdkResponse.payload.secret).toBe(secret);
  });

  test('preserves the existing response viewer for other methods', async () => {
    const sdkResponse = { success: true, payload: { address: 'test-address' } };
    jest.mocked(executeProtocolAwareMethod).mockResolvedValue(sdkResponse);
    const onExecute = jest.fn();
    const [executeButton] = collectElements(
      PlaygroundExecutor({
        methodPayload: { method: 'btcGetAddress' },
        onAcquireParams: () => Promise.resolve({}),
        onExecute,
      })
    );
    if (!executeButton.props.onPress) throw new Error('Missing execution button');
    await executeButton.props.onPress();

    expect(onExecute).toHaveBeenCalledWith(JSON.stringify(sdkResponse, null, 2));
  });
});
