import { Routes, Route } from 'react-router-dom';

// Components
import MainLayout from './components/layout/MainLayout';

// Providers
import { I18nProvider } from './i18n/i18n-provider';
import { SDKProvider } from './components/providers/SDKProvider';

// Toaster for global notifications
import { Toaster } from './components/ui/Toaster';

// Pages - import from routes directory
import IndexPage from './routes/_index';
import LogsPage from './routes/logs';
import EmulatorPage from './routes/emulator';

// New split route pages
import ChainsIndexPage from './routes/chains._index';
import ChainMethodsIndexPage from './routes/chains.$chainId._index';
import ChainMethodExecutePage from './routes/chains.$chainId.$methodName';
import DeviceMethodsIndexPage from './routes/device-methods._index';
import DeviceMethodExecutePage from './routes/device-methods.$methodName';
import FirmwareUpdateIndexPage from './routes/firmware-update._index';
import FirmwareUpdateMethodExecutePage from './routes/firmware-update.$methodName';

// Styles
import './tailwind.css';

export default function App() {
  return (
    <I18nProvider>
      <SDKProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/emulator" element={<EmulatorPage />} />

            {/* Device Methods Routes */}
            <Route path="/device-methods" element={<DeviceMethodsIndexPage />} />
            <Route path="/device-methods/:methodName" element={<DeviceMethodExecutePage />} />

            {/* Firmware Update Routes */}
            <Route path="/firmware-update" element={<FirmwareUpdateIndexPage />} />
            <Route
              path="/firmware-update/:methodName"
              element={<FirmwareUpdateMethodExecutePage />}
            />

            {/* Chain Methods Routes */}
            <Route path="/chains" element={<ChainsIndexPage />} />
            <Route path="/chains/:chainId" element={<ChainMethodsIndexPage />} />
            <Route path="/chains/:chainId/:methodName" element={<ChainMethodExecutePage />} />
          </Routes>
        </MainLayout>
        <Toaster />
      </SDKProvider>
    </I18nProvider>
  );
}
