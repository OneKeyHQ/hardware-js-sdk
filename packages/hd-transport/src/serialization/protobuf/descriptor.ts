import { Buffer } from 'buffer';

// Must execute before @bufbuild/protobuf imports so Jest/CJS cold-start configures text encoding first.
// eslint-disable-next-line import/order
import { ensureTextEncoding } from './text-encoding';

// eslint-disable-next-line import/order
import {
  ScalarType,
  create,
  createFileRegistry,
  fromBinary,
  isFieldSet,
  toBinary,
} from '@bufbuild/protobuf';
// eslint-disable-next-line import/order
import {
  DescriptorProtoSchema,
  EnumDescriptorProtoSchema,
  EnumValueDescriptorProtoSchema,
  FieldDescriptorProtoSchema,
  // eslint-disable-next-line camelcase
  FieldDescriptorProto_Label as FieldLabel,
  FieldOptionsSchema,
  // eslint-disable-next-line camelcase
  FieldDescriptorProto_Type as FieldTypeEnum,
  FileDescriptorProtoSchema,
  FileDescriptorSetSchema,
  OneofDescriptorProtoSchema,
  // eslint-disable-next-line import/no-unresolved
} from '@bufbuild/protobuf/wkt';

import type { DescEnum, DescField, DescMessage, Message } from '@bufbuild/protobuf';
import type {
  DescriptorProto,
  EnumDescriptorProto,
  FieldDescriptorProto,
  // eslint-disable-next-line camelcase
  FieldDescriptorProto_Type as FieldType,
  FileDescriptorProto,
  OneofDescriptorProto,
  // eslint-disable-next-line import/no-unresolved
} from '@bufbuild/protobuf/wkt';

export interface ProtobufFieldJson {
  id: number;
  type: string;
  rule?: string;
  options?: Record<string, unknown>;
}

export interface ProtobufOneofJson {
  oneof: string[];
}

export interface ProtobufTypeJson {
  fields: Record<string, ProtobufFieldJson>;
  oneofs?: Record<string, ProtobufOneofJson>;
  options?: Record<string, unknown>;
  nested?: Record<string, ProtobufNodeJson>;
}

export interface ProtobufEnumJson {
  values: Record<string, number>;
  options?: Record<string, unknown>;
}

export interface ProtobufNamespaceJson {
  nested?: Record<string, ProtobufNodeJson>;
  options?: Record<string, unknown>;
}

export type ProtobufNodeJson = ProtobufTypeJson | ProtobufEnumJson | ProtobufNamespaceJson;

export interface ProtobufFieldInfo {
  id: number;
  name: string;
  type: string;
  rule?: string;
  optional: boolean;
  required: boolean;
  repeated: boolean;
  defaultValue?: unknown;
  options?: Record<string, unknown>;
}

export interface ProtobufMessageType {
  readonly name: string;
  readonly fullName: string;
  readonly desc: unknown;
  readonly options?: Record<string, unknown>;
  readonly fields: Record<string, ProtobufFieldInfo>;
  readonly fieldsArray: ProtobufFieldInfo[];
  create(properties?: Record<string, unknown>): Record<string, unknown>;
  encode(message: Record<string, unknown>): { finish(): Uint8Array };
  decode(reader: Uint8Array | Buffer): Record<string, unknown>;
}

export interface ProtobufEnumType {
  readonly name: string;
  readonly fullName: string;
  readonly desc: unknown;
  readonly values: Record<string, number>;
  readonly valuesById: Record<number, string>;
}

export interface ProtobufRoot {
  readonly registry: unknown;
  lookup(name: string): ProtobufMessageType | ProtobufEnumType | null;
  lookupType(name: string): ProtobufMessageType;
  lookupEnum(name: string): ProtobufEnumType;
  listTypes(): ProtobufMessageType[];
}

export const getMessageDesc = (messageType: ProtobufMessageType): DescMessage =>
  messageType.desc as DescMessage;

export const getFieldValue = (record: Record<string, unknown>, field: DescField): unknown => {
  if (field.oneof) {
    const oneofVal = record[field.oneof.localName] as
      | { case?: string; value?: unknown }
      | undefined;
    return oneofVal?.case === field.localName ? oneofVal.value : undefined;
  }
  return record[field.localName];
};

export const setFieldValue = (
  record: Record<string, unknown>,
  field: DescField,
  value: unknown
): void => {
  if (field.oneof) {
    record[field.oneof.localName] = { case: field.localName, value };
  } else {
    record[field.localName] = value;
  }
};

export const RAW_DECODED_SYMBOL = Symbol.for('@onekeyfe/hd-transport/raw-decoded');

export const isRawDecodedMessage = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  Boolean((value as Record<PropertyKey, unknown>)[RAW_DECODED_SYMBOL]);

export const isLongBitPair = (
  value: unknown
): value is { low: number; high: number; unsigned?: boolean } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { low?: unknown }).low === 'number' &&
  typeof (value as { high?: unknown }).high === 'number' &&
  Number.isInteger((value as { low: number }).low) &&
  Number.isInteger((value as { high: number }).high);

export const longBitPairToBigInt = (
  value: { low: number; high: number; unsigned?: boolean },
  unsigned: boolean
): bigint => {
  const lowU32 = BigInt.asUintN(32, BigInt(value.low));
  const highU32 = BigInt.asUintN(32, BigInt(value.high));
  const combined = highU32 * BigInt(0x100000000) + lowU32;
  return unsigned ? BigInt.asUintN(64, combined) : BigInt.asIntN(64, combined);
};

const bigIntToLongLike = (value: bigint, unsigned: boolean) => {
  const normalized = unsigned ? BigInt.asUintN(64, value) : BigInt.asIntN(64, value);
  const u64 = BigInt.asUintN(64, normalized);
  const lowU32 = u64 % BigInt(0x100000000);
  const highU32 = (u64 - lowU32) / BigInt(0x100000000);
  const low = Number(BigInt.asIntN(32, lowU32));
  const high = Number(BigInt.asIntN(32, highU32));
  const obj = { low, high, unsigned };
  const current = () => longBitPairToBigInt(obj, Boolean(obj.unsigned));
  Object.defineProperties(obj, {
    toString: { value: () => current().toString(), enumerable: false },
    toJSON: { value: () => current().toString(), enumerable: false },
    toNumber: { value: () => Number(current()), enumerable: false },
  });
  return obj;
};

const SCALAR_TYPE_MAP: Record<string, FieldType> = {
  double: FieldTypeEnum.DOUBLE,
  float: FieldTypeEnum.FLOAT,
  int64: FieldTypeEnum.INT64,
  uint64: FieldTypeEnum.UINT64,
  int32: FieldTypeEnum.INT32,
  fixed64: FieldTypeEnum.FIXED64,
  fixed32: FieldTypeEnum.FIXED32,
  bool: FieldTypeEnum.BOOL,
  string: FieldTypeEnum.STRING,
  bytes: FieldTypeEnum.BYTES,
  uint32: FieldTypeEnum.UINT32,
  sfixed32: FieldTypeEnum.SFIXED32,
  sfixed64: FieldTypeEnum.SFIXED64,
  sint32: FieldTypeEnum.SINT32,
  sint64: FieldTypeEnum.SINT64,
};

function isTypeNode(node: ProtobufNodeJson): node is ProtobufTypeJson {
  return 'fields' in node && typeof node.fields === 'object' && node.fields !== null;
}

function isEnumNode(node: ProtobufNodeJson): node is ProtobufEnumJson {
  return 'values' in node && typeof node.values === 'object' && node.values !== null;
}

type SymbolKind = 'message' | 'enum';

interface SymbolIndex {
  kinds: Map<string, SymbolKind>;
  messageOptions: Map<string, Record<string, unknown>>;
  messageFields: Map<string, Record<string, ProtobufFieldInfo>>;
}

function buildFullName(scope: string[], name: string): string {
  return scope.length > 0 ? `${scope.join('.')}.${name}` : name;
}

function indexNamespace(
  nested: Record<string, ProtobufNodeJson> | undefined,
  scope: string[],
  index: SymbolIndex
): void {
  if (!nested) return;
  for (const [name, node] of Object.entries(nested)) {
    const fullName = buildFullName(scope, name);
    if (isTypeNode(node)) {
      index.kinds.set(fullName, 'message');
      if (node.options) {
        index.messageOptions.set(fullName, node.options);
      }
      const fields: Record<string, ProtobufFieldInfo> = {};
      for (const [fieldName, field] of Object.entries(node.fields)) {
        const repeated = field.rule === 'repeated';
        const required = field.rule === 'required';
        fields[fieldName] = {
          id: field.id,
          name: fieldName,
          type: field.type,
          rule: field.rule,
          optional: !repeated && !required,
          required,
          repeated,
          options: field.options,
        };
      }
      index.messageFields.set(fullName, fields);
      indexNamespace(node.nested, [...scope, name], index);
    } else if (isEnumNode(node)) {
      index.kinds.set(fullName, 'enum');
    } else if (node.nested) {
      indexNamespace(node.nested, [...scope, name], index);
    }
  }
}

function resolveTypeName(
  rawType: string,
  scope: string[],
  index: SymbolIndex
): { fullName: string; kind: SymbolKind } {
  const normalized = rawType.startsWith('.') ? rawType.slice(1) : rawType;
  if (rawType.startsWith('.')) {
    const kind = index.kinds.get(normalized);
    if (kind) return { fullName: normalized, kind };
  }
  for (let i = scope.length; i >= 0; i -= 1) {
    const candidate = i > 0 ? `${scope.slice(0, i).join('.')}.${normalized}` : normalized;
    const kind = index.kinds.get(candidate);
    if (kind) return { fullName: candidate, kind };
  }
  const scopeLabel = scope.length > 0 ? `.${scope.join('.')}` : 'Root';
  throw new Error(`no such Type or Enum '${rawType}' in ${scopeLabel}`);
}

function buildEnumProto(name: string, node: ProtobufEnumJson): EnumDescriptorProto {
  return create(EnumDescriptorProtoSchema, {
    name,
    value: Object.entries(node.values).map(([valueName, number]) =>
      create(EnumValueDescriptorProtoSchema, { name: valueName, number })
    ),
  });
}

function buildFieldProto(
  fieldName: string,
  field: ProtobufFieldJson,
  scope: string[],
  index: SymbolIndex,
  oneofIndex?: number
): FieldDescriptorProto {
  let label = FieldLabel.OPTIONAL;
  if (field.rule === 'required') {
    label = FieldLabel.REQUIRED;
  } else if (field.rule === 'repeated') {
    label = FieldLabel.REPEATED;
  }

  const scalarType = SCALAR_TYPE_MAP[field.type];
  let type: FieldType;
  let typeName: string | undefined;

  if (scalarType !== undefined) {
    type = scalarType;
  } else {
    const resolved = resolveTypeName(field.type, scope, index);
    type = resolved.kind === 'enum' ? FieldTypeEnum.ENUM : FieldTypeEnum.MESSAGE;
    typeName = `.${resolved.fullName}`;
  }

  const isPackable =
    label === FieldLabel.REPEATED &&
    type !== FieldTypeEnum.STRING &&
    type !== FieldTypeEnum.BYTES &&
    type !== FieldTypeEnum.MESSAGE;
  let packed: boolean | undefined;
  if (field.options && typeof field.options.packed === 'boolean') {
    packed = field.options.packed;
  } else if (isPackable) {
    packed = true;
  }
  const options = packed !== undefined ? create(FieldOptionsSchema, { packed }) : undefined;

  const hasDefault = field.options !== undefined && 'default' in field.options;
  const defaultValue = hasDefault ? String(field.options?.default) : undefined;

  return create(FieldDescriptorProtoSchema, {
    name: fieldName,
    number: field.id,
    label,
    type,
    typeName,
    defaultValue,
    options,
    ...(oneofIndex !== undefined ? { oneofIndex } : {}),
  });
}

function buildMessageProto(
  name: string,
  node: ProtobufTypeJson,
  parentScope: string[],
  index: SymbolIndex
): DescriptorProto {
  const scope = [...parentScope, name];
  const nestedType: DescriptorProto[] = [];
  const enumType: EnumDescriptorProto[] = [];

  if (node.nested) {
    for (const [childName, childNode] of Object.entries(node.nested)) {
      if (isTypeNode(childNode)) {
        nestedType.push(buildMessageProto(childName, childNode, scope, index));
      } else if (isEnumNode(childNode)) {
        enumType.push(buildEnumProto(childName, childNode));
      }
    }
  }

  const oneofDecl: OneofDescriptorProto[] = [];
  const fieldToOneofIndex = new Map<string, number>();
  if (node.oneofs) {
    for (const [oneofName, oneofDef] of Object.entries(node.oneofs)) {
      const idx = oneofDecl.length;
      oneofDecl.push(create(OneofDescriptorProtoSchema, { name: oneofName }));
      if (Array.isArray(oneofDef?.oneof)) {
        for (const memberName of oneofDef.oneof) {
          fieldToOneofIndex.set(memberName, idx);
        }
      }
    }
  }

  const fields = Object.entries(node.fields).map(([fieldName, field]) =>
    buildFieldProto(fieldName, field, scope, index, fieldToOneofIndex.get(fieldName))
  );

  return create(DescriptorProtoSchema, {
    name,
    field: fields,
    nestedType,
    enumType,
    oneofDecl,
  });
}

function collectPackageFiles(
  nested: Record<string, ProtobufNodeJson> | undefined,
  pkgScope: string[],
  index: SymbolIndex,
  files: FileDescriptorProto[]
): void {
  if (!nested) return;
  const messageType: DescriptorProto[] = [];
  const enumType: EnumDescriptorProto[] = [];
  const childNamespaces: Array<[string, ProtobufNamespaceJson]> = [];

  for (const [name, node] of Object.entries(nested)) {
    if (isTypeNode(node)) {
      messageType.push(buildMessageProto(name, node, pkgScope, index));
    } else if (isEnumNode(node)) {
      enumType.push(buildEnumProto(name, node));
    } else if (node.nested) {
      childNamespaces.push([name, node]);
    }
  }

  for (const [childName, childNode] of childNamespaces) {
    collectPackageFiles(childNode.nested, [...pkgScope, childName], index, files);
  }

  if (messageType.length > 0 || enumType.length > 0) {
    const pkg = pkgScope.join('.');
    const fileName = pkg ? `${pkg.replace(/\./g, '/')}.proto` : 'messages.proto';
    const dependency = files.map(f => f.name);
    files.push(
      create(FileDescriptorProtoSchema, {
        name: fileName,
        package: pkg || undefined,
        syntax: 'proto2',
        dependency,
        messageType,
        enumType,
      })
    );
  }
}

function assertRawRequiredFields(desc: DescMessage, msg: Message): void {
  const record = msg as unknown as Record<string, unknown>;
  for (const field of desc.fields) {
    if (field.fieldKind === 'list') {
      if (field.listKind === 'message') {
        const list = record[field.localName];
        if (Array.isArray(list)) {
          for (const item of list) {
            assertRawRequiredFields(field.message, item as Message);
          }
        }
      }
    } else {
      if (field.proto.label === FieldLabel.REQUIRED && !isFieldSet(msg, field)) {
        const hasUnknownEnumWireValue =
          field.fieldKind === 'enum' && msg.$unknown?.some(u => u.no === field.number) === true;
        if (!hasUnknownEnumWireValue) {
          throw new Error(`missing required '${field.name}'`);
        }
      }
      if (field.fieldKind === 'message' && isFieldSet(msg, field)) {
        const sub = getFieldValue(record, field);
        if (sub != null) {
          assertRawRequiredFields(field.message, sub as Message);
        }
      }
    }
  }
}

function getFieldDefaultValue(desc: DescMessage, fieldName: string): unknown {
  const field = desc.fields.find(f => f.name === fieldName);
  if (!field) return undefined;
  if (field.fieldKind === 'list') return [];
  if (field.fieldKind === 'scalar') {
    const explicit = field.getDefaultValue();
    if (explicit !== undefined) return explicit;
    if (field.scalar === ScalarType.BYTES) return new Uint8Array(0);
    if (field.scalar === ScalarType.STRING) return '';
    if (field.scalar === ScalarType.BOOL) return false;
    return 0;
  }
  if (field.fieldKind === 'enum') {
    const explicit = field.getDefaultValue();
    if (explicit !== undefined) return explicit;
    return field.enum.values[0]?.number ?? 0;
  }
  return null;
}

const is64BitRawScalar = (scalar: ScalarType): boolean =>
  scalar === ScalarType.INT64 ||
  scalar === ScalarType.UINT64 ||
  scalar === ScalarType.SINT64 ||
  scalar === ScalarType.FIXED64 ||
  scalar === ScalarType.SFIXED64;

const isUnsigned64RawScalar = (scalar: ScalarType): boolean =>
  scalar === ScalarType.UINT64 || scalar === ScalarType.FIXED64;

function rawMessageToPlain(desc: DescMessage, msg: Message): Record<string, unknown> {
  const record = msg as unknown as Record<string, unknown>;
  const proto: Record<PropertyKey, unknown> = {};
  Object.defineProperty(proto, RAW_DECODED_SYMBOL, {
    value: true,
    enumerable: false,
  });
  for (const field of desc.fields) {
    proto[field.name] = getFieldDefaultValue(desc, field.name);
  }
  for (const oneof of desc.oneofs) {
    const memberNames = oneof.fields.map(f => f.name);
    Object.defineProperty(proto, oneof.name, {
      enumerable: false,
      configurable: true,
      get(this: Record<string, unknown>) {
        for (const memberName of memberNames) {
          if (
            Object.prototype.hasOwnProperty.call(this, memberName) &&
            this[memberName] !== undefined &&
            this[memberName] !== null
          ) {
            return memberName;
          }
        }
        return undefined;
      },
    });
  }
  const out = Object.create(proto) as Record<string, unknown>;
  for (const field of desc.fields) {
    if (field.fieldKind === 'list') {
      const list = record[field.localName];
      if (Array.isArray(list) && list.length > 0) {
        if (field.listKind === 'message') {
          out[field.name] = list.map(v => rawMessageToPlain(field.message, v as Message));
        } else if (field.listKind === 'scalar' && is64BitRawScalar(field.scalar)) {
          const unsigned = isUnsigned64RawScalar(field.scalar);
          out[field.name] = list.map(v =>
            typeof v === 'bigint' ? bigIntToLongLike(v, unsigned) : v
          );
        } else {
          out[field.name] = [...list];
        }
      }
    } else if (isFieldSet(msg, field)) {
      const val = getFieldValue(record, field);
      if (field.fieldKind === 'message' && val != null) {
        out[field.name] = rawMessageToPlain(field.message, val as Message);
      } else if (
        field.fieldKind === 'scalar' &&
        is64BitRawScalar(field.scalar) &&
        typeof val === 'bigint'
      ) {
        out[field.name] = bigIntToLongLike(val, isUnsigned64RawScalar(field.scalar));
      } else {
        out[field.name] = val;
      }
    }
  }
  return out;
}

function coerceRawEnumValue(enumDesc: DescEnum, val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isInteger(val)) return val;
  if (typeof val === 'string') {
    const matched = enumDesc.values.find(v => v.name === val);
    if (matched) return matched.number;
    if (val.trim() !== '') {
      const numeric = Number(val);
      if (Number.isInteger(numeric)) return numeric;
    }
  }
  return undefined;
}

function coerceRawBytes(val: unknown): Uint8Array {
  if (val instanceof Uint8Array) {
    return new Uint8Array(val.buffer, val.byteOffset, val.byteLength);
  }
  if (typeof val === 'string') {
    return val.length === 0 ? new Uint8Array(0) : new Uint8Array(Buffer.from(val, 'base64'));
  }
  if (Array.isArray(val)) {
    return Uint8Array.from(val as number[]);
  }
  return new Uint8Array(val as ArrayBuffer);
}

function defaultRawValueForRequired(desc: DescMessage, fieldName: string): unknown {
  const field = desc.fields.find(f => f.name === fieldName);
  if (!field) return undefined;
  if (field.fieldKind === 'scalar') {
    const explicit = field.getDefaultValue();
    if (explicit !== undefined) return explicit;
    if (
      field.scalar === ScalarType.INT64 ||
      field.scalar === ScalarType.UINT64 ||
      field.scalar === ScalarType.SINT64 ||
      field.scalar === ScalarType.FIXED64 ||
      field.scalar === ScalarType.SFIXED64
    ) {
      return BigInt(0);
    }
  }
  return getFieldDefaultValue(desc, fieldName);
}

function plainToRawMessage(desc: DescMessage, input: Record<string, unknown>): Message {
  const msg = create(desc) as unknown as Record<string, unknown>;
  const skipInheritedDefaults = isRawDecodedMessage(input);
  for (const field of desc.fields) {
    // Ignore inherited prototype defaults on raw decoded objects so re-encoding preserves
    // absent optional fields and oneof selection without hiding caller-supplied prototypes.
    const val =
      skipInheritedDefaults && !Object.prototype.hasOwnProperty.call(input, field.name)
        ? undefined
        : input[field.name];
    if (val === undefined || val === null) {
      if (field.fieldKind !== 'list' && field.proto.label === FieldLabel.REQUIRED) {
        if (field.fieldKind === 'message') {
          throw new TypeError(`missing required '${desc.typeName}.${field.name}'`);
        }
        setFieldValue(msg, field, defaultRawValueForRequired(desc, field.name));
      }
    } else if (field.fieldKind === 'list') {
      if (Array.isArray(val)) {
        if (field.listKind === 'message') {
          msg[field.localName] = val.map(v => {
            if (v === null || v === undefined || typeof v !== 'object' || Array.isArray(v)) {
              throw new TypeError(`${desc.typeName}.${field.name}: object expected`);
            }
            return plainToRawMessage(field.message, v as Record<string, unknown>);
          });
        } else if (field.listKind === 'scalar' && field.scalar === ScalarType.BYTES) {
          msg[field.localName] = val.map(v => coerceRawBytes(v));
        } else if (field.listKind === 'scalar' && is64BitRawScalar(field.scalar)) {
          const unsigned = isUnsigned64RawScalar(field.scalar);
          msg[field.localName] = val.map(v =>
            isLongBitPair(v) ? longBitPairToBigInt(v, unsigned) : v
          );
        } else if (field.listKind === 'enum') {
          msg[field.localName] = val
            .map(v => coerceRawEnumValue(field.enum, v))
            .filter((v): v is number => v !== undefined);
        } else {
          msg[field.localName] = [...val];
        }
      }
    } else if (field.fieldKind === 'message') {
      if (typeof val !== 'object' || Array.isArray(val)) {
        throw new TypeError(`${desc.typeName}.${field.name}: object expected`);
      }
      setFieldValue(msg, field, plainToRawMessage(field.message, val as Record<string, unknown>));
    } else if (field.fieldKind === 'enum') {
      const enumNumber = coerceRawEnumValue(field.enum, val);
      if (enumNumber !== undefined) {
        setFieldValue(msg, field, enumNumber);
      } else if (field.proto.label === FieldLabel.REQUIRED) {
        setFieldValue(msg, field, defaultRawValueForRequired(desc, field.name));
      }
    } else if (field.fieldKind === 'scalar' && field.scalar === ScalarType.BYTES) {
      setFieldValue(msg, field, coerceRawBytes(val));
    } else if (
      field.fieldKind === 'scalar' &&
      is64BitRawScalar(field.scalar) &&
      isLongBitPair(val)
    ) {
      setFieldValue(msg, field, longBitPairToBigInt(val, isUnsigned64RawScalar(field.scalar)));
    } else {
      setFieldValue(msg, field, val);
    }
  }
  return msg as unknown as Message;
}

export function createProtobufRoot(data: ProtobufNamespaceJson | string): ProtobufRoot {
  const schema: ProtobufNamespaceJson =
    typeof data === 'string' ? (JSON.parse(data) as ProtobufNamespaceJson) : data;
  const topLevel: Record<string, ProtobufNodeJson> | undefined =
    schema.nested && typeof schema.nested === 'object'
      ? schema.nested
      : (schema as Record<string, ProtobufNodeJson>);

  const index: SymbolIndex = {
    kinds: new Map(),
    messageOptions: new Map(),
    messageFields: new Map(),
  };
  indexNamespace(topLevel, [], index);

  const files: FileDescriptorProto[] = [];
  collectPackageFiles(topLevel, [], index, files);

  const fileDescriptorSet = create(FileDescriptorSetSchema, { file: files });
  const registry = createFileRegistry(fileDescriptorSet);

  const typeCache = new Map<string, ProtobufMessageType>();
  const enumCache = new Map<string, ProtobufEnumType>();

  const wrapMessage = (desc: DescMessage): ProtobufMessageType => {
    const existing = typeCache.get(desc.typeName);
    if (existing) return existing;
    const rawFields = index.messageFields.get(desc.typeName) ?? {};
    const fields: Record<string, ProtobufFieldInfo> = {};
    for (const [fname, finfo] of Object.entries(rawFields)) {
      fields[fname] = { ...finfo, defaultValue: getFieldDefaultValue(desc, fname) };
    }
    const wrapped: ProtobufMessageType = {
      name: desc.name,
      fullName: desc.typeName,
      desc,
      options: index.messageOptions.get(desc.typeName),
      fields,
      fieldsArray: Object.values(fields),
      create(properties: Record<string, unknown> = {}) {
        return { ...properties };
      },
      encode(message: Record<string, unknown>) {
        return {
          finish: () => {
            ensureTextEncoding();
            return toBinary(desc, plainToRawMessage(desc, message ?? {}));
          },
        };
      },
      decode(reader: Uint8Array | Buffer) {
        ensureTextEncoding();
        const bytes =
          reader instanceof Uint8Array
            ? new Uint8Array(reader.buffer, reader.byteOffset, reader.byteLength)
            : new Uint8Array(reader);
        const decoded = fromBinary(desc, bytes);
        assertRawRequiredFields(desc, decoded);
        return rawMessageToPlain(desc, decoded);
      },
    };
    typeCache.set(desc.typeName, wrapped);
    return wrapped;
  };

  const wrapEnum = (desc: DescEnum): ProtobufEnumType => {
    const existing = enumCache.get(desc.typeName);
    if (existing) return existing;
    const values: Record<string, number> = {};
    const valuesById: Record<number, string> = {};
    for (const v of desc.values) {
      values[v.name] = v.number;
      valuesById[v.number] = v.name;
    }
    const wrapped: ProtobufEnumType = {
      name: desc.name,
      fullName: desc.typeName,
      desc,
      values,
      valuesById,
    };
    enumCache.set(desc.typeName, wrapped);
    return wrapped;
  };

  const normalizeName = (name: string) => (name.startsWith('.') ? name.slice(1) : name);

  const findNestedName = (name: string, expectedKind: SymbolKind): string | undefined => {
    const suffix = `.${name}`;
    for (const [fullName, kind] of index.kinds.entries()) {
      if (kind === expectedKind && fullName.endsWith(suffix)) {
        return fullName;
      }
    }
    return undefined;
  };

  const root: ProtobufRoot = {
    registry,
    lookup(name: string): ProtobufMessageType | ProtobufEnumType | null {
      const normalized = normalizeName(name);
      const msgDesc =
        registry.getMessage(normalized) ??
        (() => {
          const nested = findNestedName(normalized, 'message');
          return nested ? registry.getMessage(nested) : undefined;
        })();
      if (msgDesc) return wrapMessage(msgDesc);
      const enumDesc =
        registry.getEnum(normalized) ??
        (() => {
          const nested = findNestedName(normalized, 'enum');
          return nested ? registry.getEnum(nested) : undefined;
        })();
      if (enumDesc) return wrapEnum(enumDesc);
      return null;
    },
    lookupType(name: string): ProtobufMessageType {
      const normalized = normalizeName(name);
      const desc =
        registry.getMessage(normalized) ??
        (() => {
          const nested = findNestedName(normalized, 'message');
          return nested ? registry.getMessage(nested) : undefined;
        })();
      if (!desc) {
        throw new Error(`no such Type or Enum '${name}' in Root`);
      }
      return wrapMessage(desc);
    },
    lookupEnum(name: string): ProtobufEnumType {
      const normalized = normalizeName(name);
      const desc =
        registry.getEnum(normalized) ??
        (() => {
          const nested = findNestedName(normalized, 'enum');
          return nested ? registry.getEnum(nested) : undefined;
        })();
      if (!desc) {
        throw new Error(`no such Enum '${name}' in Root`);
      }
      return wrapEnum(desc);
    },
    listTypes(): ProtobufMessageType[] {
      const result: ProtobufMessageType[] = [];
      for (const [fullName, kind] of index.kinds.entries()) {
        if (kind === 'message') {
          const desc = registry.getMessage(fullName);
          if (desc) result.push(wrapMessage(desc));
        }
      }
      return result;
    },
  };

  return root;
}
