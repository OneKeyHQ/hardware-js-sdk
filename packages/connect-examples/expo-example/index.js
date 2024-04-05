import './shim';
import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

// eslint-disable-next-line import/no-unresolved
import App from './App';

// reg Non-serializable values were found in the navigation state
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews with the same orientation because it can break windowing and other functionality - use another VirtualizedList-backed container instead',
  'Non-serializable values were found in the navigation state',
]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
