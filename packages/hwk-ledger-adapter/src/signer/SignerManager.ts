import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum';
import { ContextModuleBuilder } from '@ledgerhq/context-module';

import { SignerEth } from './SignerEth';
import { debugLog } from '../utils/debugLog';

import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import type { SignerEth as ISdkSignerEth } from '@ledgerhq/device-signer-kit-ethereum';
import type { ContextModule } from '@ledgerhq/context-module';

type SignerEthBuilderFn = (args: {
  dmk: DeviceManagementKit;
  sessionId: string;
}) =>
  | {
      withContextModule?(contextModule: ContextModule): { build(): ISdkSignerEth };
      build(): ISdkSignerEth;
    }
  | Promise<{
      withContextModule?(contextModule: ContextModule): { build(): ISdkSignerEth };
      build(): ISdkSignerEth;
    }>;

/**
 * Per-sessionId SignerEth factory. Builds fresh on every call — DMK signers
 * hold DeviceAction state that isn't safe to reuse, so `invalidate` /
 * `clearAll` are kept as no-op lifecycle hooks for callers.
 */
export class SignerManager {
  private readonly _dmk: DeviceManagementKit;

  private readonly _builderFn: SignerEthBuilderFn;

  constructor(dmk: DeviceManagementKit, builderFn?: SignerEthBuilderFn) {
    this._dmk = dmk;
    this._builderFn = builderFn ?? SignerManager._defaultBuilder();
  }

  async getOrCreate(sessionId: string): Promise<SignerEth> {
    debugLog('[DMK] SignerManager.getOrCreate:', { sessionId });
    const builder = await this._builderFn({ dmk: this._dmk, sessionId });
    const builderWithContext = builder.withContextModule
      ? builder.withContextModule(SignerManager._createContextModule())
      : builder;
    return new SignerEth(builderWithContext.build());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
  invalidate(_sessionId: string): void {}

  // eslint-disable-next-line class-methods-use-this
  clearAll(): void {}

  private static _defaultBuilder(): SignerEthBuilderFn {
    return args => {
      return new SignerEthBuilder(args);
    };
  }

  private static _createContextModule(): ContextModule {
    const contextModule = new ContextModuleBuilder({}).removeDefaultLoaders().build();
    return SignerManager.wrapBlindSigningReportNonBlocking(contextModule);
  }

  static wrapBlindSigningReportNonBlocking<T extends ContextModule>(contextModule: T): T {
    const report = contextModule.report.bind(contextModule);
    contextModule.report = async params => {
      try {
        void report(params).catch(err => {
          debugLog('[DMK] ContextModule.report failed:', err);
        });
      } catch (err) {
        debugLog('[DMK] ContextModule.report failed:', err);
      }
    };
    return contextModule;
  }
}
