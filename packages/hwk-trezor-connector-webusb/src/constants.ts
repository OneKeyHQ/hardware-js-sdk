/**
 * USB constants for Trezor devices.
 *
 * Matches @trezor/transport src/constants.ts. T1 HID (vendor 0x534c) is NOT
 * WebUSB-accessible — it uses the HID class which navigator.usb can't claim;
 * users with T1 need the bridge daemon. We only expose 0x1209 (WebUSB-class)
 * here.
 */
export const TREZOR_WEBUSB_VENDOR_ID = 0x1209;

/** Trezor firmware (Model T / Safe 5 / Safe 3) running normally */
export const TREZOR_WEBUSB_FIRMWARE_PRODUCT = 0x53c1;

/** Trezor firmware in bootloader mode (firmware update / wipe) */
export const TREZOR_WEBUSB_BOOTLOADER_PRODUCT = 0x53c0;

/** Standard WebUSB filters that show only WebUSB-accessible Trezor devices in the picker. */
export const TREZOR_WEBUSB_FILTERS: USBDeviceFilter[] = [
  { vendorId: TREZOR_WEBUSB_VENDOR_ID, productId: TREZOR_WEBUSB_FIRMWARE_PRODUCT },
  { vendorId: TREZOR_WEBUSB_VENDOR_ID, productId: TREZOR_WEBUSB_BOOTLOADER_PRODUCT },
];

/** Trezor's standard USB layout — configuration 1, interface 0, endpoint 1. */
export const TREZOR_USB_CONFIGURATION_ID = 1;
export const TREZOR_USB_INTERFACE_ID = 0;
export const TREZOR_USB_ENDPOINT_ID = 1;

/** Trezor wire packet size on USB. */
export const TREZOR_USB_PACKET_SIZE = 64;
