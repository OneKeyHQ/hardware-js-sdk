export const MAX_EDITABLE_PARAMETER_LENGTH = 100_000;

export interface PreparedPresetEditor {
  editorValue: string;
  isOversized: boolean;
  oversizedPreset: object | null;
}

export function preparePresetEditor(preset: {
  title: string;
  value: object;
}): PreparedPresetEditor {
  const serializedValue = JSON.stringify(preset.value, null, 2);
  const isOversized = serializedValue.length > MAX_EDITABLE_PARAMETER_LENGTH;

  return {
    editorValue: isOversized
      ? JSON.stringify(
          {
            preset: preset.title,
            notice:
              'Large preset is kept out of the editor and will be passed directly to the SDK.',
            serializedCharacters: serializedValue.length,
          },
          null,
          2
        )
      : serializedValue,
    isOversized,
    oversizedPreset: isOversized ? preset.value : null,
  };
}

export function acquireEditorParams(editorValue: string, oversizedPreset: object | null): object {
  if (oversizedPreset) return oversizedPreset;

  try {
    return JSON.parse(editorValue) as object;
  } catch {
    return {};
  }
}
