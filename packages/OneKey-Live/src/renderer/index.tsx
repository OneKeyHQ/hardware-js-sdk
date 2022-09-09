import { createRoot } from 'react-dom/client';
import Provider from './Provider';
import '@onekeyhq/ui-components/index.css';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<Provider />);
