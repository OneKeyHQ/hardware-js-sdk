import type { SignerEth as ISdkSignerEth } from '@ledgerhq/device-signer-kit-ethereum';
import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum';
import { ContextModuleBuilder } from '@ledgerhq/context-module';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { SignerEth } from './SignerEth';
import { debugLog } from '../utils/debugLog';

type SignerEthBuilderFn = (args: {
  dmk: DeviceManagementKit;
  sessionId: string;
}) => { build(): ISdkSignerEth } | Promise<{ build(): ISdkSignerEth }>;

/**
 * Manages per-sessionId SignerEth instances.
 * Creates on demand, caches for reuse, invalidates on session change.
 */
export class SignerManager {
  private readonly _cache = new Map<string, SignerEth>();
  private readonly _dmk: DeviceManagementKit;
  private readonly _builderFn: SignerEthBuilderFn;

  constructor(dmk: DeviceManagementKit, builderFn?: SignerEthBuilderFn) {
    this._dmk = dmk;
    this._builderFn = builderFn ?? SignerManager._defaultBuilder();
  }

  async getOrCreate(sessionId: string): Promise<SignerEth> {
    const hadCached = this._cache.has(sessionId);
    // Always create a fresh signer — DMK signers may maintain internal DeviceAction
    // state that can prevent subsequent operations if reused.
    this._cache.delete(sessionId);

    debugLog('[DMK] SignerManager.getOrCreate:', { sessionId, hadCached, creating: true });
    const builder = await this._builderFn({ dmk: this._dmk, sessionId });
    const sdkSigner = builder.build();
    debugLog('[DMK] SignerManager: new signer built');
    const signer = new SignerEth(sdkSigner);
    this._cache.set(sessionId, signer);
    return signer;
  }

  invalidate(sessionId: string): void {
    this._cache.delete(sessionId);
  }

  clearAll(): void {
    this._cache.clear();
  }

  private static _defaultBuilder(): SignerEthBuilderFn {
    return (args) => {
      const contextModule = new ContextModuleBuilder({}).removeDefaultLoaders().build();
      return new SignerEthBuilder(args).withContextModule(contextModule);
    };
  }
}
