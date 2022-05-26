export interface Unsuccessful {
  success: false;
  payload: { error: string; code?: string };
}

export interface Success<T> {
  success: true;
  payload: T;
}

export type Response<T> = Promise<Success<T> | Unsuccessful>;
