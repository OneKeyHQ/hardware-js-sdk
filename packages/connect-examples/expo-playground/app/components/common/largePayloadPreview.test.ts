import { readFileSync } from 'fs';
import { resolve } from 'path';

import { afterEach, describe, expect, test } from '@jest/globals';

import { useHardwareStore } from '../../store/hardwareStore';
import {
  getEditableJsonPreview,
  getJsonPreview,
  MAX_EDITABLE_JSON_LENGTH,
} from '../../utils/jsonPreview';

const parameterInputSource = readFileSync(resolve(__dirname, 'ParameterInput.tsx'), 'utf8');
const jsonEditorSource = readFileSync(resolve(__dirname, 'JsonEditor.tsx'), 'utf8');
const hardwareStoreSource = readFileSync(
  resolve(__dirname, '../../store/hardwareStore.ts'),
  'utf8'
);

describe('large payload previews', () => {
  afterEach(() => {
    useHardwareStore.getState().resetParameters();
  });

  test('bounds deeply nested large arrays without changing the source value', () => {
    const items = Array.from({ length: 80_000 }, (_, index) => ({ index }));
    const payload = { refTxs: [{ bin_outputs: items }] };

    const preview = getJsonPreview(payload);

    expect(preview.truncated).toBe(true);
    expect(preview.text.length).toBeLessThan(10_000);
    expect(preview.text).toContain('79980 more items');
    expect(items).toHaveLength(80_000);
  });

  test('only disables editing when the serialized value exceeds the explicit size limit', () => {
    const ordinaryValue = {
      items: Array.from({ length: 21 }, (_, index) => index),
      text: 'x'.repeat(513),
    };
    expect(getEditableJsonPreview(ordinaryValue)).toMatchObject({ truncated: false });

    const serializedWrapperLength = JSON.stringify({ text: '' }, null, 2).length;
    const valueAtLimit = {
      text: 'x'.repeat(MAX_EDITABLE_JSON_LENGTH - serializedWrapperLength),
    };
    expect(JSON.stringify(valueAtLimit, null, 2)).toHaveLength(MAX_EDITABLE_JSON_LENGTH);
    expect(getEditableJsonPreview(valueAtLimit).truncated).toBe(false);

    const valueOverLimit = { text: `${valueAtLimit.text}x` };
    const overLimitPreview = getEditableJsonPreview(valueOverLimit);
    expect(overLimitPreview.truncated).toBe(true);
    expect(overLimitPreview.text.length).toBeLessThan(10_000);
  });

  test('keeps the original large parameter object in the SDK execution state', () => {
    const refTxs = [{ bin_outputs: Array.from({ length: 80_000 }, (_, index) => index) }];

    useHardwareStore.getState().setMethodParameters({ refTxs });

    expect(useHardwareStore.getState().getExecutionParameters().refTxs).toBe(refTxs);
  });

  test('uses bounded read-only previews in parameter and request editors', () => {
    expect(parameterInputSource).toContain('getEditableJsonPreview(value)');
    expect(parameterInputSource).toContain('const canEdit = isEditable && !jsonPreview?.truncated');
    expect(parameterInputSource).toContain('readOnly={!canEdit}');
    expect(parameterInputSource).not.toContain('value: param.value');
    expect(hardwareStoreSource).not.toContain('原始方法参数: methodParams');
    expect(hardwareStoreSource).not.toContain('最终执行参数: cleanParams');

    expect(jsonEditorSource).toContain('data ? getEditableJsonPreview(data) : null');
    expect(jsonEditorSource).toContain('{jsonPreview?.text}');
    expect(jsonEditorSource).toContain("t('components.jsonEditor.largePayloadNotice')");
  });
});
