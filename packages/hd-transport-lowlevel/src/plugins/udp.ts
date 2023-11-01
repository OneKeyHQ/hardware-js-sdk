import transport, { LowlevelTransportSharedPlugin } from '@onekeyfe/hd-transport';
import ByteBuffer from 'bytebuffer';
import AbstractInterface from '../interfaces/AbstractInterface';

const { decodeProtocol } = transport;
type UsbTransportConstructorParams = {
  transportInterface: AbstractInterface;
  version: string;
};

const PACKET_SIZE = 64;
const HEADER_LENGTH = 6;

export class UsbTransportPlugin implements LowlevelTransportSharedPlugin {
  private transportInterface: AbstractInterface;

  version: string;

  constructor({ transportInterface, version }: UsbTransportConstructorParams) {
    this.transportInterface = transportInterface;
    this.version = version;
  }

  enumerate() {
    return this.transportInterface.enumerate();
  }

  connect(_uuid: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  disconnect(_uuid: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  init(): Promise<void> {
    return Promise.resolve(undefined);
  }

  receive(): Promise<string> {
    console.log('call receive');
    return new Promise(async resolve => {
      const firstPacket = await this.transportInterface.read('');
      console.log('receive first packet: ', firstPacket.toString('hex'));
      const firstData = firstPacket.slice(1);
      const { length, typeId, restBuffer } = decodeProtocol.decodeChunked(firstData);

      const lengthWithHeader = Number(length + HEADER_LENGTH);
      const decoded = new ByteBuffer(lengthWithHeader);
      decoded.writeUint16(typeId);
      decoded.writeUint32(length);
      if (length) {
        decoded.append(restBuffer);
      }

      console.log('chunk length: ', length, decoded.offset, lengthWithHeader);

      while (decoded.offset < lengthWithHeader) {
        const data = await this.transportInterface.read('');
        console.log('receive next packet: ', data.toString('hex'));

        if (!data) {
          throw new Error('no data');
        }
        if (data.byteLength === 0) {
          // empty data
          console.warn('empty data');
        }
        const buffer = data.slice(1);
        if (lengthWithHeader - decoded.offset >= PACKET_SIZE) {
          decoded.append(buffer);
        } else {
          decoded.append(buffer.slice(0, lengthWithHeader - decoded.offset));
        }
      }
      decoded.reset();
      resolve(decoded.toString('hex'));
    });
  }

  send(uuid: string, data: string): Promise<void> {
    console.log('call send', uuid, data);
    return this.transportInterface.write(uuid, Buffer.from(data, 'hex'));
  }
}
