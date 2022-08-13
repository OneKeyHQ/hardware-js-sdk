import HDTransport from '@onekeyfe/hd-transport';
import ByteBuffer from 'bytebuffer';
import { decode } from 'punycode';

const getHID = () => navigator.usb;

navigator.usb.addEventListener('connect', event => {
  console.log('connect: ======>>>> ', event);
});

navigator.usb.addEventListener('disconnect', event => {
  console.log('disconnect: ======>>>> ', event);
});

const filters = [
  // TREZOR v1
  // won't get opened, but we can show error at least
  { vendorId: 0x534c, productId: 0x0001 },
  // TREZOR webusb Bootloader
  { vendorId: 0x1209, productId: 0x53c0 },
  // TREZOR webusb Firmware
  { vendorId: 0x1209, productId: 0x53c1 },
];

export const ledgerUSBVendorId = 0x2c97;
const trezorUSBVendorId = 0x534c;
const filters1 = [{ vendorId: trezorUSBVendorId }];

let device: USBDevice | null = null;

export const requestDevice = async () => {
  const devices = await getHID().requestDevice({ filters });
  console.log(devices);
  if (Array.isArray(devices)) {
    // eslint-disable-next-line prefer-destructuring
    device = devices[0];
  } else {
    device = devices;
  }
};

export const getDevices = async () => {
  const devices = await getHID().getDevices();
  console.log(devices);
  if (Array.isArray(devices) && devices.length > 0) {
    // eslint-disable-next-line prefer-destructuring
    device = devices[0];
  }
};

export const open = async () => {
  if (!device) {
    return;
  }
  await device.open();

  if (device?.configuration === null) {
    await device.selectConfiguration(1);
  }

  await gracefullyResetDevice(device);

  const iface = device.configurations[0].interfaces.find(({ alternates }) =>
    alternates.some(a => a.interfaceClass === 255)
  );

  if (!iface) {
    throw new Error(
      'No WebUSB interface found for your Ledger device. Please upgrade firmware or contact techsupport.'
    );
  }

  const { interfaceNumber } = iface;

  try {
    await device.claimInterface(interfaceNumber);
  } catch (e: any) {
    await device.close();
    throw new Error(e.message);
  }

  const onDisconnect = (e: any) => {
    if (device === e.device) {
      // $FlowFixMe
      navigator.usb.removeEventListener('disconnect', onDisconnect);
    }
  };
  navigator.usb.addEventListener('disconnect', onDisconnect);

  console.log(device);

  await send();
};

function toArrayBuffer(buf: Buffer) {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}

export const send = async () => {
  // const arrayBuffer =
  const buffer = Buffer.from('IyMAAAAAAAA=', 'base64');
  const data = toArrayBuffer(buffer);
  const newArray: Uint8Array = new Uint8Array(64);
  newArray[0] = 63;
  newArray.set(new Uint8Array(data), 1);

  await device?.transferOut(1, newArray).then(() => {});

  // const res = await device?.transferIn(1, 64);
  // console.log(res);
  await receiveAndParse();
};

export const receiveAndParse = async () => {
  const res = await device?.transferIn(1, 64);
  console.log('receiveRes: ', res);
  const data = res?.data?.buffer.slice(1);
  const { length, typeId, restBuffer } = HDTransport.decodeProtocol.decodeChunked(
    data as ArrayBuffer
  );

  console.log('chunk length: ', length);

  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  const length1 = Number(length + 6);
  const decoded = new ByteBuffer(length1);
  // decoded.writeByte(0x23);
  // decoded.writeByte(0x23);
  decoded.writeUint16(typeId);
  decoded.writeUint32(length);
  if (length) {
    decoded.append(restBuffer);
  }

  console.log('first decoded: ', decoded);

  while (decoded.offset < length1) {
    const otherRes = await device?.transferIn(1, 64);
    console.log('otherRes data: ', otherRes?.data?.buffer);
    console.log('otherRes length: ', otherRes?.data?.byteLength);
    if (!otherRes?.data) {
      throw new Error('no data');
    }
    if (otherRes?.data?.byteLength === 0) {
      console.log('000000000000000000////////!!!!!!!!: ', otherRes);
    }
    const buf = otherRes.data.buffer.slice(1);
    if (length1 - decoded.offset >= 64) {
      decoded.append(buf);
    } else {
      decoded.append(buf.slice(0, length1 - decoded.offset));
    }
    console.log('offset: ', decoded.offset);
  }

  decoded.reset();
  const result = decoded.toBuffer();
  console.log(Buffer.from(result).toString('hex'));
};

async function gracefullyResetDevice(device: USBDevice) {
  try {
    await device.reset();
  } catch (err) {
    console.warn(err);
  }
}

export default {
  requestDevice,
  getDevices,
  send,
};
