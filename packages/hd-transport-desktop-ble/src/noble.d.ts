declare module '@abandonware/noble' {
  export interface Peripheral {
    id: string;

    advertisement: {
      localName: string | null;
    };

    connect(callback: (error?: Error) => void): void;

    disconnect(): void;

    discoverServices(
      serviceUUIDs: string[],
      callback: (error: Error | null, services: Service[]) => void
    ): void;

    on(
      event: 'notification',
      listener: (serviceUuid: string, characteristicUuid: string, data: Buffer) => void
    ): this;

    removeListener(event: string, listener: (...args: any[]) => void): this;

    off(event: string, listener: (...args: any[]) => void): this;
  }

  export interface Service {
    uuid: string;
    discoverCharacteristics(
      characteristicUUIDs: string[],
      callback: (error: Error | null, characteristics: Characteristic[]) => void
    ): void;
  }

  export interface Characteristic {
    uuid: string;
    write(data: Buffer, withoutResponse: boolean, callback: (error?: Error) => void): void;
    notify(enable: boolean, callback: (error?: Error) => void): void;
  }

  export function on(event: 'stateChange', callback: (state: string) => void): void;
  export function on(event: 'discover', callback: (peripheral: Peripheral) => void): void;
  export function removeListener(event: string, callback: (...args: any[]) => void): void;
  export function off(event: string, callback: (...args: any[]) => void): void;
  export function startScanning(serviceUUIDs?: string[], allowDuplicates?: boolean): void;
  export function stopScanning(): void;
}
