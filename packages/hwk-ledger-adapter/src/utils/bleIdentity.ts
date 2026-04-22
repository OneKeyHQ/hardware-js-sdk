/**
 * Extract the stable 4-digit HEX identifier from a Ledger BLE device name.
 * e.g., "Nano X 123A" -> "123A", "Ledger Nano X AB12" -> "AB12"
 * Returns undefined if no valid HEX suffix found.
 */
export function extractBleHexId(name?: string): string | undefined {
  if (!name) return undefined;
  const match = name.match(/\b([0-9A-Fa-f]{4})$/);
  return match ? match[1].toUpperCase() : undefined;
}
