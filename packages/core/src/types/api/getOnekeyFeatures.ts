import type { CommonParams, Response } from '../params';
import type { OnekeyFeatures } from '../device';

export declare function getOnekeyFeatures(
  connectId?: string,
  params?: CommonParams
): Response<OnekeyFeatures>;
