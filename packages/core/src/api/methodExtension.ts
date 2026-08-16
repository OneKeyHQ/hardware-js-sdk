import type { ProtobufSchema } from '@onekeyfe/hd-transport';
import type { BaseMethod } from './BaseMethod';
import type { IFrameCallMessage } from '../events';
import type { ProtobufMessageSchema } from '../data-manager/DataManager';

export type CoreMethodConstructor = new (
  message: IFrameCallMessage & { id?: number }
) => BaseMethod<any>;

export type CoreMethodExtension = {
  name: string;
  methods: Readonly<Record<string, CoreMethodConstructor>>;
  protobufSchemas?: Partial<Record<ProtobufMessageSchema, ProtobufSchema>>;
  destructiveMethods?: readonly string[];
};
