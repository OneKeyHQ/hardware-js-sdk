import { compatibilityManager } from '../DeviceCompatibility';
import { classic1sPlugin } from './classic1s';
import { classicPlugin } from './classic';
import { classicPurePlugin } from './classicpure';
import { miniPlugin } from './mini';
import { touchPlugin } from './touch';
import { proPlugin } from './pro';
import { pro2Plugin } from './pro2';
import { neoPlugin } from './neo';

// Register all device plugins
compatibilityManager.registerPlugin(classic1sPlugin);
compatibilityManager.registerPlugin(classicPlugin);
compatibilityManager.registerPlugin(classicPurePlugin);
compatibilityManager.registerPlugin(miniPlugin);
compatibilityManager.registerPlugin(touchPlugin);
compatibilityManager.registerPlugin(proPlugin);
compatibilityManager.registerPlugin(pro2Plugin);
compatibilityManager.registerPlugin(neoPlugin);

export {
  classic1sPlugin,
  classicPlugin,
  classicPurePlugin,
  miniPlugin,
  touchPlugin,
  proPlugin,
  pro2Plugin,
  neoPlugin,
};
