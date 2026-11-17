import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Children, isValidElement, useContext, useEffect, useState } from 'react';

import Playground from '../components/Playground';
import PlaygroundExecutor from '../components/PlaygroundExecutor';
import { executeProtocolAwareMethod } from '../utils/protocolAwareMethod';
import {
  acquireEditorParams,
  MAX_EDITABLE_PARAMETER_LENGTH,
  preparePresetEditor,
} from '../utils/presetEditor';

import { readDevice } from '../utils/manualSigning/common';
import type { PrepareSigningSample } from '../utils/manualSigning/common';
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
  id?: string;
  prepareSample?: PrepareSigningSample;
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

describe('API Payload execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useContext).mockReturnValue({ sdk: {} });
    jest.mocked(useState).mockReturnValue([false, jest.fn()]);
  });

  test.each([
    'btcSignTransaction',
    'zcashSignPczt',
    'moneroSignTransaction',
    'moneroKeyImageSync',
    'zcashGetFullViewingKey',
  ])('%s preserves raw SDK success and failure for both execution buttons', async method => {
    for (const result of [
      { success: true, payload: { encKey: 'fake-response-value' } },
      { success: false, payload: { error: 'device-error', code: 101 } },
    ]) {
      for (const manual of [false, true]) {
        jest
          .mocked(executeProtocolAwareMethod)
          .mockClear()
          .mockImplementation(options =>
            Promise.resolve(
              options.method === 'btcGetPublicKey' ? { success: true, payload: {} } : result
            )
          );
        const params = { selected: 'preset' };
        const prepare = jest.fn(async (call: Parameters<PrepareSigningSample>[0]) => {
          await readDevice(call, 'btcGetPublicKey', {});
          return params;
        });
        const onExecute = jest.fn();
        const onPrepared = jest.fn();
        const buttons = collectElements(
          PlaygroundExecutor({
            methodPayload: { method },
            onAcquireParams: () => Promise.resolve(params),
            prepareSample: prepare,
            onPrepared,
            onExecute,
          })
        ).filter(element => element.type === 'button');
        expect(executeProtocolAwareMethod).not.toHaveBeenCalled();
        await buttons[manual ? 1 : 0].props.onPress?.();
        expect(prepare).toHaveBeenCalledTimes(manual ? 1 : 0);
        expect(
          jest.mocked(executeProtocolAwareMethod).mock.calls.map(([options]) => options.method)
        ).toEqual(manual ? ['btcGetPublicKey', method] : [method]);
        expect(jest.mocked(executeProtocolAwareMethod).mock.calls.at(-1)?.[0]).toMatchObject({
          method,
          params,
        });
        expect(onExecute).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
        if (manual) expect(onPrepared).toHaveBeenCalledWith(params);
      }
    }
  });

  test.each([0, 1])('uses only the selected preset generator (index %i)', selected => {
    const prepare = jest.fn();
    jest
      .mocked(useState)
      .mockReturnValueOnce([false, jest.fn()])
      .mockReturnValueOnce(['', jest.fn()])
      .mockReturnValueOnce([false, jest.fn()])
      .mockReturnValueOnce(['', jest.fn()])
      .mockReturnValueOnce([selected, jest.fn()]);
    const executor = collectElements(
      Playground({
        method: 'zcashSignPczt',
        presupposes: [
          { title: 'transparent', value: {}, prepareSample: prepare },
          { title: 'shielded', value: {}, prepareSample: null },
        ],
      })
    ).find(element => element.type === PlaygroundExecutor);
    expect(executor?.props.prepareSample).toBe(selected === 0 ? prepare : undefined);
    expect(prepare).not.toHaveBeenCalled();
  });

  test('preserves a preparation read failure and never starts signing', async () => {
    const result = { success: false, payload: { error: 'original-read-error', code: 101 } };
    jest.mocked(executeProtocolAwareMethod).mockResolvedValue(result);
    const onExecute = jest.fn();
    const buttons = collectElements(
      PlaygroundExecutor({
        methodPayload: { method: 'btcSignTransaction' },
        onAcquireParams: jest.fn(),
        onExecute,
        prepareSample: async call => {
          await readDevice(call, 'btcGetPublicKey', {});
          return {};
        },
      })
    ).filter(element => element.type === 'button');
    await buttons[1].props.onPress?.();
    expect(executeProtocolAwareMethod).toHaveBeenCalledTimes(1);
    expect(onExecute).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
  });

  test('ignores duplicate clicks and stops after unmount during preparation', async () => {
    let finishRead: ((result: { success: true; payload: object }) => void) | undefined;
    jest.mocked(executeProtocolAwareMethod).mockImplementation(
      () =>
        new Promise(resolve => {
          finishRead = resolve;
        })
    );
    const cancel = jest.fn();
    jest.mocked(useContext).mockReturnValue({ sdk: { cancel } });
    const onExecute = jest.fn();
    const prepare = jest.fn(async (call: Parameters<PrepareSigningSample>[0]) => {
      await readDevice(call, 'btcGetPublicKey', {});
      return {};
    });
    const buttons = collectElements(
      PlaygroundExecutor({
        methodPayload: { method: 'btcSignTransaction' },
        onAcquireParams: jest.fn(),
        onExecute,
        prepareSample: prepare,
      })
    ).filter(element => element.type === 'button');
    const cleanup = jest.mocked(useEffect).mock.calls[0][0]();
    const pending = buttons[1].props.onPress?.();
    await buttons[1].props.onPress?.();
    expect(prepare).toHaveBeenCalledTimes(1);
    if (typeof cleanup !== 'function' || !finishRead) throw new Error('Missing preparation');
    cleanup();
    finishRead({ success: true, payload: {} });
    await pending;
    expect(cancel).toHaveBeenCalledWith('test-connect');
    expect(executeProtocolAwareMethod).toHaveBeenCalledTimes(1);
    expect(onExecute).not.toHaveBeenCalled();
  });
});
