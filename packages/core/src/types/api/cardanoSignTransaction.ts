import type { CommonParams, Response } from '../params';
import type { CardanoSignTransaction, CardanoSignedTxData } from './cardano';

export declare function cardanoSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & CardanoSignTransaction
): Response<CardanoSignedTxData>;
