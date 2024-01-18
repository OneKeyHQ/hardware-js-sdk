import { View, StyleSheet, Text } from 'react-native';
import { useContextSelector } from 'use-context-selector';
import { TestRunnerContext, TestRunnerProvider } from './Context/TestRunnerProvider';
import { TestRunnerVerifyProvider } from './Context/TestRunnerVerifyProvider';
import { TestCase } from './types';
import { TestRunnerResultView } from './TestRunnerResultView';
import type { TestRunnerResultViewProps } from './TestRunnerResultView';

type TestRunnerInfoProps = {
  title: string;
};
function TestRunnerInfoView({ title }: TestRunnerInfoProps) {
  return <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{title}</Text>;
}

export type TestRunnerViewProps<T> = {
  renderExecuteView: () => React.ReactNode;
} & TestRunnerResultViewProps &
  TestRunnerInfoProps;

export function TestRunnerView<T>({
  title,
  renderExecuteView,
  renderResultView,
}: TestRunnerViewProps<T>) {
  return (
    <TestRunnerProvider>
      <TestRunnerVerifyProvider>
        <View style={styles.subContainer}>
          <TestRunnerInfoView title={title} />
          {renderExecuteView()}
          <TestRunnerResultView renderResultView={renderResultView} />
        </View>
      </TestRunnerVerifyProvider>
    </TestRunnerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  subContainer: {
    width: '100%',
    marginTop: 16,
    padding: 10,
    backgroundColor: '#FFF',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
  },
  fullItem: {
    width: '100%',
  },
});
