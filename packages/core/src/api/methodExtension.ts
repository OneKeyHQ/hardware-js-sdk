import * as FactoryMethods from './factoryMethods';
import * as TestMethods from './testMethods';
import { FACTORY_API_METHOD_NAMES } from './extensionMethodNames';

import type { BaseMethod } from './BaseMethod';
import type { IFrameCallMessage } from '../events';

export type CoreMethodConstructor = new (
  message: IFrameCallMessage & { id?: number }
) => BaseMethod<any>;

export type CoreMethodExtension = {
  name: string;
  methods: Readonly<Record<string, CoreMethodConstructor>>;
  destructiveMethods?: readonly string[];
};

export const testApiMethodExtension: CoreMethodExtension = {
  name: 'test-api',
  methods: TestMethods as unknown as Record<string, CoreMethodConstructor>,
};

export const factoryApiMethodExtension: CoreMethodExtension = {
  name: 'factory-api',
  methods: FactoryMethods as unknown as Record<string, CoreMethodConstructor>,
  destructiveMethods: FACTORY_API_METHOD_NAMES,
};
