export interface CommonParams {
  connectId?: string;
  device?: {
    path: string;
    state?: string;
    instance?: number;
  };
  useEmptyPassphrase?: boolean;
  useEventListener?: boolean; // this param is set automatically in factory
  allowSeedlessDevice?: boolean;
  keepSession?: boolean;
  skipFinalReload?: boolean;
  useCardanoDerivation?: boolean;
}

export interface Unsuccessful {
  success: false;
  payload: { error: string; code?: string };
}

export interface Success<T> {
  success: true;
  payload: T;
}

export type Response<T> = Promise<Success<T> | Unsuccessful>;
