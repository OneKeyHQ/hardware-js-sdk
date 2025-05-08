import { OneKeyInfoTargets, OneKeyInfoTypes } from '@onekeyfe/hd-transport';
import { IFeaturesType } from './Device';

export const cherryPickFeaturesParams = (featuresType: IFeaturesType) => {
  const { factory } = featuresType;
  const targets: OneKeyInfoTargets = {
    status: true,
    hw: true,
    fw: true,
    bt: true,
  };
  const types: OneKeyInfoTypes = {
    version: true,
    specific: true,
  };
  if (factory) {
    targets.se1 = true;
    targets.se2 = true;
    targets.se3 = true;
    targets.se4 = true;
    types.build_id = true;
    types.hash = true;
  }
  return { targets, types };
};
