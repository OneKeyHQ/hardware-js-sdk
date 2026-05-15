import { signerMethodsRegistry } from '../hooks/useMethodsRegistry';

const SIGNER_METHODS_WITH_COMMON_PARAMETERS = new Set(
  signerMethodsRegistry.allMethods.map(method => method.method)
);

export const methodSupportsCommonParameters = (method?: string) =>
  Boolean(method && SIGNER_METHODS_WITH_COMMON_PARAMETERS.has(method));
