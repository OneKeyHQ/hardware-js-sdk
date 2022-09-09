import { useEffect } from 'react';
import { UIProvider } from '@onekeyhq/ui-components';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';
import { addIpcListener } from './process-transport';

export default function AppProvider() {
  useEffect(() => {
    const subscription = addIpcListener();
    return () => {
      console.log('remove ipc listener');
      subscription?.();
    };
  });

  return (
    // @ts-expect-error
    <UIProvider defaultTheme="light">
      <Provider store={store}>
        <App />
      </Provider>
    </UIProvider>
  );
}
