import { LowLevelDevice } from '@onekeyfe/hd-transport';

export default abstract class AbstractInterface {
  abstract enumerate(): Promise<LowLevelDevice[]>;

  abstract write(path: string, buffer: Buffer): Promise<void>;

  abstract read(path: string): Promise<Buffer>;

  closeDevice() {}

  openDevice() {}
}
