import { app } from 'electron';

import BridgeProcess, { BridgeHeart } from './Bridge';

let bridgeInstance: BridgeProcess;
export const launchBridge = async (isDevelopment: boolean) => {
  const bridge = new BridgeProcess();

  try {
    console.info('bridge: Staring');
    await bridge.start([], isDevelopment);
    bridgeInstance = bridge;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    BridgeHeart.start(() => restartBridge());
  } catch (err) {
    console.error(`bridge: Start failed: ${(err as Error).message}`);
    console.error(err);
  }

  app.on('before-quit', () => {
    console.info('bridge', 'Stopping when app quit');
    bridge.stop();
  });
};

export const restartBridge = async () => {
  console.debug('bridge: ', 'Restarting');
  await bridgeInstance?.restart();
};

const init = async ({ isDevelopment }: { isDevelopment: boolean }) => {
  console.info('Electron main process log path: ');
  await launchBridge(isDevelopment);
};

export default init;
