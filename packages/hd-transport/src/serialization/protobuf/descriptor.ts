import {
  ScalarType,
  create,
  createFileRegistry,
  fromBinary,
  isFieldSet,
  toBinary,
} from '@bufbuild/protobuf';
import {
  DescriptorProtoSchema,
  EnumDescriptorProtoSchema,
  EnumValueDescriptorProtoSchema,
  FieldDescriptorProtoSchema,
  // eslint-disable-next-line camelcase
  FieldDescriptorProto_Label as FieldLabel,
  // eslint-disable-next-line camelcase
  FieldDescriptorProto_Type as FieldType,
  FieldOptionsSchema,
  FileDescriptorProtoSchema,
  FileDescriptorSetSchema,
  // eslint-disable-next-line import/no-unresolved
} from '@bufbuild/protobuf/wkt';

import { ensureTextEncoding } from './text-encoding';

import type { DescEnum, DescMessage, FileRegistry, Message } from '@bufbuild/protobuf';
import type {
  DescriptorProto,
  EnumDescriptorProto,
  FieldDescriptorProto,
  FileDescriptorProto,
  // eslint-disable-next-line import/no-unresolved
} from '@bufbuild/protobuf/wkt';

export interface ProtobufFieldJson {
  id: number;
  type: string;
  rule?: string;
  options?: Record<string, unknown>;
}

export interface ProtobufTypeJson {
  fields: Record<string, ProtobufFieldJson>;
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
  readonly desc: DescMessage;
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
  readonly desc: DescEnum;
  readonly values: Record<string, number>;
  readonly valuesById: Record<number, string>;
}

export interface ProtobufRoot {
  readonly registry: FileRegistry;
  lookup(name: string): ProtobufMessageType | ProtobufEnumType | null;
  lookupType(name: string): ProtobufMessageType;
  lookupEnum(name: string): ProtobufEnumType;
  listTypes(): ProtobufMessageType[];
}

const SCALAR_TYPE_MAP: Record<string, FieldType> = {
  double: FieldType.DOUBLE,
  float: FieldType.FLOAT,
  int64: FieldType.INT64,
  uint64: FieldType.UINT64,
  int32: FieldType.INT32,
  fixed64: FieldType.FIXED64,
  fixed32: FieldType.FIXED32,
  bool: FieldType.BOOL,
  string: FieldType.STRING,
  bytes: FieldType.BYTES,
  uint32: FieldType.UINT32,
  sfixed32: FieldType.SFIXED32,
  sfixed64: FieldType.SFIXED64,
  sint32: FieldType.SINT32,
  sint64: FieldType.SINT64,
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
  placeholders: Set<string>;
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
  // Partial test schemas may reference external message types without defining them.
  index.placeholders.add(normalized);
  return { fullName: normalized, kind: 'message' };
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
  index: SymbolIndex
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
    type = resolved.kind === 'enum' ? FieldType.ENUM : FieldType.MESSAGE;
    typeName = `.${resolved.fullName}`;
  }

  const isPackable =
    label === FieldLabel.REPEATED &&
    type !== FieldType.STRING &&
    type !== FieldType.BYTES &&
    type !== FieldType.MESSAGE;
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

  const fields = Object.entries(node.fields).map(([fieldName, field]) =>
    buildFieldProto(fieldName, field, scope, index)
  );

  return create(DescriptorProtoSchema, {
    name,
    field: fields,
    nestedType,
    enumType,
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
        const sub = record[field.localName];
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

function rawMessageToPlain(desc: DescMessage, msg: Message): Record<string, unknown> {
  const record = msg as unknown as Record<string, unknown>;
  const proto: Record<string, unknown> = {};
  for (const field of desc.fields) {
    proto[field.name] = getFieldDefaultValue(desc, field.name);
  }
  const out = Object.create(proto) as Record<string, unknown>;
  for (const field of desc.fields) {
    if (field.fieldKind === 'list') {
      const list = record[field.localName];
      if (Array.isArray(list) && list.length > 0) {
        out[field.name] =
          field.listKind === 'message'
            ? list.map(v => rawMessageToPlain(field.message, v as Message))
            : [...list];
      }
    } else if (isFieldSet(msg, field)) {
      const val = record[field.localName];
      if (field.fieldKind === 'message' && val != null) {
        out[field.name] = rawMessageToPlain(field.message, val as Message);
      } else {
        out[field.name] = val;
      }
    }
  }
  return out;
}

function plainToRawMessage(desc: DescMessage, input: Record<string, unknown>): Message {
  const msg = create(desc) as unknown as Record<string, unknown>;
  for (const field of desc.fields) {
    const val = input[field.name];
    if (val !== undefined && val !== null) {
      if (field.fieldKind === 'list') {
        if (Array.isArray(val)) {
          if (field.listKind === 'message') {
            msg[field.localName] = val.map(v =>
              plainToRawMessage(field.message, (v ?? {}) as Record<string, unknown>)
            );
          } else if (field.listKind === 'scalar' && field.scalar === ScalarType.BYTES) {
            msg[field.localName] = val.map(v => (v instanceof Uint8Array ? v : new Uint8Array(v)));
          } else {
            msg[field.localName] = [...val];
          }
        }
      } else if (field.fieldKind === 'message' && typeof val === 'object') {
        msg[field.localName] = plainToRawMessage(field.message, val as Record<string, unknown>);
      } else if (field.fieldKind === 'scalar' && field.scalar === ScalarType.BYTES) {
        msg[field.localName] = val instanceof Uint8Array ? val : new Uint8Array(val as ArrayBuffer);
      } else {
        msg[field.localName] = val;
      }
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
    placeholders: new Set(),
  };
  indexNamespace(topLevel, [], index);

  const files: FileDescriptorProto[] = [];
  collectPackageFiles(topLevel, [], index, files);

  if (index.placeholders.size > 0) {
    const placeholderMessages = Array.from(index.placeholders).map(name =>
      create(DescriptorProtoSchema, { name: name.includes('.') ? name.split('.').pop()! : name })
    );
    files.unshift(
      create(FileDescriptorProtoSchema, {
        name: '__placeholders__.proto',
        syntax: 'proto2',
        messageType: placeholderMessages,
      })
    );
    for (let i = 1; i < files.length; i += 1) {
      files[i].dependency.push('__placeholders__.proto');
    }
  }

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
