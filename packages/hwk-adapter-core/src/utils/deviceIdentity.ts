export type DetectableHardwareVendor = 'onekey' | 'trezor' | 'ledger';

export type HardwareDeviceIdentityInput = {
  name?: string | null;
  localName?: string | null;
  bleName?: string | null;
  model?: string | null;
  modelName?: string | null;
  type?: string | null;
  productName?: string | null;
  manufacturerName?: string | null;
  vendor?: number | string | null;
  vendorId?: number | null;
  product?: number | string | null;
  productId?: number | null;
  label?: string | null;
  fw_vendor?: string | null;
  internal_model?: string | null;
  onekey_version?: string | null;
  onekey_device_type?: string | null;
  onekey_serial?: string | null;
  serviceUUIDs?: string[] | null;
  advertisedServiceUuids?: string[] | null;
  serviceUuids?: string[] | null;
};

const ONEKEY_BLE_SERVICE_UUID = '00000001-0000-1000-8000-00805f9b34fb';
const TREZOR_BLE_SERVICE_UUID = '8c000001-a59b-4d58-a9ad-073df69fa1b1';
const LEDGER_USB_VENDOR_ID = 0x2c97;

const lower = (value?: string | null): string => value?.trim().toLowerCase() ?? '';

const hasServiceUuid = (input: HardwareDeviceIdentityInput, uuid: string): boolean => {
  const expected = uuid.toLowerCase();
  const values = [
    ...(input.serviceUUIDs ?? []),
    ...(input.advertisedServiceUuids ?? []),
    ...(input.serviceUuids ?? []),
  ];
  return values.some(value => value.toLowerCase() === expected);
};

export function detectHardwareVendorFromDescriptor(
  input: HardwareDeviceIdentityInput
): DetectableHardwareVendor | undefined {
  const manufacturerName = lower(input.manufacturerName);
  const fwVendor = lower(input.fw_vendor);

  if (
    hasServiceUuid(input, ONEKEY_BLE_SERVICE_UUID) ||
    manufacturerName.includes('onekey') ||
    fwVendor === 'onekey' ||
    input.onekey_version ||
    input.onekey_device_type ||
    input.onekey_serial
  ) {
    return 'onekey';
  }
  if (
    hasServiceUuid(input, TREZOR_BLE_SERVICE_UUID) ||
    manufacturerName.includes('trezor') ||
    fwVendor === 'trezor'
  ) {
    return 'trezor';
  }
  if (
    (typeof input.vendor === 'number' && input.vendor === LEDGER_USB_VENDOR_ID) ||
    input.vendorId === LEDGER_USB_VENDOR_ID ||
    manufacturerName.includes('ledger')
  ) {
    return 'ledger';
  }
  return undefined;
}

export function isKnownNonTargetHardwareVendor(
  input: HardwareDeviceIdentityInput,
  targetVendor: DetectableHardwareVendor
): boolean {
  const detectedVendor = detectHardwareVendorFromDescriptor(input);
  return detectedVendor !== undefined && detectedVendor !== targetVendor;
}
