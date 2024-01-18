import { useContextSelector } from 'use-context-selector';
import { memo, useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { TestRunnerContext } from './Context/TestRunnerProvider';
import { TestCaseDataWithKey } from './types';
import { TestRunnerVerifyContext } from './Context/TestRunnerVerifyProvider';

export type TestItemViewProps = {
  item: TestCaseDataWithKey;
  renderResultView: (item: TestCaseDataWithKey) => React.ReactNode;
};

const TestItemView = ({ item, renderResultView }: TestItemViewProps) => {
  const itemVerifyState = useContextSelector(
    TestRunnerVerifyContext,
    v => v.itemVerifyState?.[item.$key]
  );

  const verifyState = useMemo(() => itemVerifyState?.verify ?? 'none', [itemVerifyState]);
  const errorState = useMemo(() => itemVerifyState?.error ?? '', [itemVerifyState]);

  const errorStateViewMemo = useMemo(() => {
    if (!errorState) return null;
    return <Text style={{ color: 'red' }}>error: {errorState}</Text>;
  }, [errorState]);

  const verifyStateViewMemo = useMemo(() => {
    let color = 'gray';
    if (verifyState === 'pending') {
      color = 'blue';
    } else if (verifyState === 'skip') {
      color = 'gray';
    } else if (verifyState === 'success') {
      color = 'green';
    } else if (verifyState === 'fail') {
      color = 'red';
    }

    return (
      <Text
        style={{
          width: 80,
          color,
          fontWeight: 'bold',
        }}
      >
        {verifyState}
      </Text>
    );
  }, [verifyState]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 8,
        gap: 8,
        borderColor: '#E0E0E0',
        borderWidth: 1,
      }}
    >
      {verifyStateViewMemo}
      <View>
        {renderResultView(item)}
        {errorStateViewMemo}
      </View>
    </View>
  );
};

const TestItemViewMemo = memo(TestItemView);

export type TestRunnerResultViewProps = Omit<TestItemViewProps, 'item'>;

export function TestRunnerResultView({ renderResultView }: TestRunnerResultViewProps) {
  const itemValues = useContextSelector(TestRunnerContext, v => v.itemValues);

  const resultViewMemo = useMemo(
    () => (
      <View style={styles.fullItem}>
        {itemValues.map(item => (
          <TestItemViewMemo renderResultView={renderResultView} key={item.$key} item={item} />
        ))}
      </View>
    ),
    [itemValues, renderResultView]
  );

  return resultViewMemo;
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
