export type ProtobufSchema = Record<string, unknown>;

const isPlainObject = (value: unknown): value is ProtobufSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeNamespace = (target: ProtobufSchema, source: ProtobufSchema, path: string) => {
  Object.entries(source).forEach(([key, sourceValue]) => {
    const currentPath = path ? `${path}.${key}` : key;
    const targetValue = target[key];

    if (targetValue === undefined) {
      target[key] = sourceValue;
      return;
    }

    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      mergeNamespace(targetValue, sourceValue, currentPath);
      return;
    }

    if (targetValue !== sourceValue) {
      throw new Error(
        `Protobuf schema extension conflicts with production schema at ${currentPath}`
      );
    }
  });
};

/**
 * Adds protobuf definitions without allowing an extension to replace production fields or IDs.
 */
export const mergeProtobufSchemas = (
  base: ProtobufSchema,
  extensions: readonly ProtobufSchema[] = []
): ProtobufSchema => {
  if (extensions.length === 0) return base;

  const merged = JSON.parse(JSON.stringify(base)) as ProtobufSchema;
  extensions.forEach(extension => mergeNamespace(merged, extension, ''));
  return merged;
};
