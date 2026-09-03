import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  acquireEditorParams,
  MAX_EDITABLE_PARAMETER_LENGTH,
  preparePresetEditor,
} from '../utils/presetEditor';

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
