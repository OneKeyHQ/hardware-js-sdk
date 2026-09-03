import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, 'ApiPayloadScreen.tsx'), 'utf8');
const expandModeSource = readFileSync(
  resolve(__dirname, '../provider/ExpandModeProvider.tsx'),
  'utf8'
);

describe('API Payload screen virtualization', () => {
  test('uses FlatList as the only page-level scroll container', () => {
    expect(source).toContain('<PageView scrollable={false}>');
    expect(source).toContain('style={{ flex: 1 }}');
    expect(source).not.toContain('<DeviceProvider>');
    expect(expandModeSource).toContain('<Stack flex={1}>');
  });

  test('keeps the initial render batch small', () => {
    expect(source).toContain('initialNumToRender={1}');
    expect(source).toContain('maxToRenderPerBatch={1}');
    expect(source).toContain('windowSize={5}');
  });
});
