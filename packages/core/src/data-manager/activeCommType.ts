export type ActiveCommType = 'usb' | 'ble';

let activeCommType: ActiveCommType | undefined;

export const setActiveCommType = (commType: ActiveCommType | undefined) => {
  activeCommType = commType;
};

export const getActiveCommType = (): ActiveCommType | undefined => activeCommType;

export const isBleCommType = (commType?: string | null): boolean =>
  commType === 'ble' || commType === 'webble' || commType === 'electron-ble';
