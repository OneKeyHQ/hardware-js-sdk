/** Raised by DeviceApps.install when DMK reports the requested app is not in the catalog. */
export class AppNotFoundInCatalogError extends Error {
  readonly missingApplications: string[];

  constructor(missing: string[]) {
    super(`Ledger app not found in catalog: ${missing.join(', ')}`);
    this.name = 'AppNotFoundInCatalogError';
    this.missingApplications = missing;
  }
}
