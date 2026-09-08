import { getParameterDisplayValue, isLazyParameterValue } from './parameterUtils';

export interface JsonPreviewOptions {
  maxDepth?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
  maxStringLength?: number;
  indent?: number;
}

export interface JsonPreviewResult {
  text: string;
  truncated: boolean;
  value: unknown;
}

const DEFAULT_PREVIEW_OPTIONS: Required<JsonPreviewOptions> = {
  maxDepth: 6,
  maxArrayItems: 20,
  maxObjectKeys: 50,
  maxStringLength: 512,
  indent: 2,
};

const UNTRUNCATED_PREVIEW_OPTIONS: JsonPreviewOptions = {
  maxDepth: Number.MAX_SAFE_INTEGER,
  maxArrayItems: Number.MAX_SAFE_INTEGER,
  maxObjectKeys: Number.MAX_SAFE_INTEGER,
  maxStringLength: Number.MAX_SAFE_INTEGER,
};

export const MAX_EDITABLE_JSON_LENGTH = 100_000;

function normalizeOptions(options: JsonPreviewOptions = {}): Required<JsonPreviewOptions> {
  return {
    ...DEFAULT_PREVIEW_OPTIONS,
    ...options,
  };
}

function formatByteSize(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function isBlobLike(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function summarizeValue(
  value: unknown,
  options: Required<JsonPreviewOptions>,
  depth: number,
  seen: WeakSet<object>
): { value: unknown; truncated: boolean } {
  if (isLazyParameterValue(value)) {
    const preview = summarizeValue(getParameterDisplayValue(value), options, depth, seen);
    return {
      value: preview.value,
      truncated: true,
    };
  }

  if (typeof value === 'bigint') {
    return { value: value.toString(), truncated: false };
  }

  if (typeof value === 'string') {
    if (value.length > options.maxStringLength) {
      return {
        value: `${value.slice(0, options.maxStringLength)}... (len=${value.length})`,
        truncated: true,
      };
    }
    return { value, truncated: false };
  }

  if (value === undefined || value === null || typeof value !== 'object') {
    return { value, truncated: false };
  }

  if (value instanceof Date) {
    return { value: value.toISOString(), truncated: false };
  }

  if (value instanceof ArrayBuffer) {
    return { value: `<ArrayBuffer ${formatByteSize(value.byteLength)}>`, truncated: true };
  }

  if (ArrayBuffer.isView(value)) {
    return {
      value: `<${value.constructor.name} ${formatByteSize(value.byteLength)}>`,
      truncated: true,
    };
  }

  if (isBlobLike(value)) {
    const fileName = 'name' in value && typeof value.name === 'string' ? value.name : 'Blob';
    return { value: `<${fileName} ${formatByteSize(value.size)}>`, truncated: true };
  }

  if (seen.has(value)) {
    return { value: '[Circular]', truncated: true };
  }

  if (depth >= options.maxDepth) {
    return {
      value: Array.isArray(value) ? `[${value.length} items]` : '[Object]',
      truncated: true,
    };
  }

  seen.add(value);

  if (Array.isArray(value)) {
    let truncated = value.length > options.maxArrayItems;
    const visibleItems = truncated ? value.slice(0, options.maxArrayItems) : value;
    const summarizedItems = visibleItems.map(item => {
      const summarized = summarizeValue(item, options, depth + 1, seen);
      truncated = truncated || summarized.truncated;
      return summarized.value;
    });

    seen.delete(value);

    if (value.length > options.maxArrayItems) {
      summarizedItems.push(`... (${value.length - options.maxArrayItems} more items)`);
    }

    return { value: summarizedItems, truncated };
  }

  const entries = Object.entries(value as Record<string, unknown>);
  let truncated = entries.length > options.maxObjectKeys;
  const visibleEntries = truncated ? entries.slice(0, options.maxObjectKeys) : entries;
  const result: Record<string, unknown> = {};

  visibleEntries.forEach(([key, item]) => {
    const summarized = summarizeValue(item, options, depth + 1, seen);
    truncated = truncated || summarized.truncated;
    result[key] = summarized.value;
  });

  if (entries.length > options.maxObjectKeys) {
    result.__truncated_keys__ = `${entries.length - options.maxObjectKeys} more keys`;
  }

  seen.delete(value);
  return { value: result, truncated };
}

export function summarizeJsonValue(value: unknown, options?: JsonPreviewOptions) {
  return summarizeValue(value, normalizeOptions(options), 0, new WeakSet()).value;
}

export function getJsonPreview(value: unknown, options?: JsonPreviewOptions): JsonPreviewResult {
  if (value === undefined) {
    return { text: '', truncated: false, value };
  }

  const normalizedOptions = normalizeOptions(options);
  const summarized = summarizeValue(value, normalizedOptions, 0, new WeakSet());

  try {
    return {
      text:
        typeof summarized.value === 'string'
          ? summarized.value
          : JSON.stringify(summarized.value, null, normalizedOptions.indent),
      truncated: summarized.truncated,
      value: summarized.value,
    };
  } catch {
    return {
      text: String(summarized.value),
      truncated: true,
      value: summarized.value,
    };
  }
}

export function formatJsonPreview(value: unknown, options?: JsonPreviewOptions): string {
  return getJsonPreview(value, options).text;
}

export function getEditableJsonPreview(value: unknown): JsonPreviewResult {
  if (!isLazyParameterValue(value)) {
    try {
      const serializedValue = JSON.stringify(getParameterDisplayValue(value), null, 2);
      if (
        typeof serializedValue === 'string' &&
        serializedValue.length <= MAX_EDITABLE_JSON_LENGTH
      ) {
        return { text: serializedValue, truncated: false, value };
      }
    } catch {
      // Fall back to a bounded preview for values that JSON cannot serialize directly.
    }
  }

  return getJsonPreview(value);
}

export function getUntruncatedJsonPreview(
  value: unknown,
  options?: Pick<JsonPreviewOptions, 'indent'>
): JsonPreviewResult {
  return getJsonPreview(value, {
    ...UNTRUNCATED_PREVIEW_OPTIONS,
    ...options,
  });
}

export function formatUntruncatedJsonPreview(
  value: unknown,
  options?: Pick<JsonPreviewOptions, 'indent'>
): string {
  return getUntruncatedJsonPreview(value, options).text;
}

export function getSearchableJsonText(value: unknown, options?: JsonPreviewOptions): string {
  return getJsonPreview(value, {
    maxDepth: 3,
    maxArrayItems: 6,
    maxObjectKeys: 30,
    maxStringLength: 256,
    indent: 0,
    ...options,
  }).text;
}
