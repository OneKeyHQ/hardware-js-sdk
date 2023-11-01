import UDP from 'react-native-udp';
import { AbstractInterface } from '@onekeyfe/hd-transport-lowlevel/src/interfaces/abstract';
import { LowLevelDevice } from '@onekeyfe/hd-transport';

export class UdpInterface extends AbstractInterface {
  interface = UDP.createSocket({
    type: 'udp4',
    debug: true,
  });

  private communicating = false;

  private paths: string[] = [];

  constructor(paths: string[]) {
    super();
    this.paths = paths;
    this.interface.bind(22324);
  }

  write(path: string, buffer: Buffer): Promise<void> {
    console.log('UdpInterface call write');
    const [hostname, port] = path.split(':');
    return new Promise(resolve => {
      this.interface.send(
        buffer,
        undefined,
        undefined,
        Number.parseInt(port, 10),
        hostname,
        err => {
          if (err) {
            // @ts-expect-error
            return resolve(err.message);
          }
          return resolve(undefined);
        }
      );
    });
  }

  async read(_path: string): Promise<Buffer> {
    this.communicating = true;
    try {
      return await new Promise(resolve => {
        const onError = (err: any) => {
          resolve(err.message);
          this.interface.removeListener('error', onError);
          this.interface.removeListener('message', onMessage);
        };
        const onMessage = (message: Buffer) => {
          if (message.toString() === 'PONGPONG') {
            return;
          }

          this.interface.removeListener('error', onError);
          this.interface.removeListener('message', onMessage);
          resolve(message);
        };
        this.interface.addListener('error', onError);
        this.interface.addListener('message', onMessage);
      });
    } finally {
      this.communicating = false;
    }
  }

  async ping(path: string) {
    await this.write(path, Buffer.from('PINGPING'));

    return new Promise(resolve => {
      const onMessage = (message: Buffer) => {
        if (message.toString() === 'PONGPONG') {
          resolve(true);
          this.interface.removeListener('message', onMessage);
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          clearTimeout(timeout);
        }
      };
      this.interface.addListener('message', onMessage);

      const timeout = setTimeout(
        () => {
          this.interface.removeListener('message', onMessage);
          resolve(false);
        },
        this.communicating ? 10000 : 500
      );
    });
  }

  async enumerate(): Promise<LowLevelDevice[]> {
    console.log('call enumerate');
    const enumerateResult = await Promise.all(
      this.paths.map(path => this.ping(path).then(pinged => (pinged ? path : undefined)))
    ).then(res => res.filter(path => path !== undefined) as string[]);

    return enumerateResult.map((path, index) => ({
      id: path,
      name: index.toString(),
    }));
  }

  closeDevice() {
    this.interface.close();
  }

  openDevice() {
    this.interface.bind(22324);
  }
}
