import { memo, useContext, useEffect, useMemo, useCallback } from 'react';

import { Stack, Text, XStack } from 'tamagui';
import { useAtomValue } from 'jotai';
import { FlatList } from 'react-native';

import { TestCaseDataWithKey } from './types';
import {
  ItemVerifyState,
  selectedItemVerifyStateAtom as createSelectedItemVerifyStateAtom,
} from './Context/TestRunnerVerifyProvider';
import { TestRunnerContext } from './Context/TestRunnerProvider';

export type TestItemViewProps = {
  item: TestCaseDataWithKey;
  renderResultView: (
    item: TestCaseDataWithKey,
    itemVerifyState: ItemVerifyState
  ) => React.ReactNode;
};

const TestItemView = ({ item, renderResultView }: TestItemViewProps) => {
  const selectedItemVerifyStateAtom = useMemo(
    () => createSelectedItemVerifyStateAtom(item.$key),
    [item.$key]
  );
  const itemVerifyState = useAtomValue(selectedItemVerifyStateAtom);

  const verifyState = useMemo(() => itemVerifyState?.verify ?? 'none', [itemVerifyState]);
  const errorState = useMemo(() => itemVerifyState?.error ?? '', [itemVerifyState]);

  const errorStateViewMemo = useMemo(() => {
    if (!errorState) return null;
    return (
      <Text fontSize={14} color="red">
        error: {errorState}
      </Text>
    );
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
    } else if (verifyState === 'warning') {
      color = 'orange';
    }

    return (
      <Text width={80} color={color} fontWeight="bold">
        {verifyState}
      </Text>
    );
  }, [verifyState]);

  return (
    <XStack
      alignItems="center"
      paddingVertical="$2"
      gap="$2"
      borderColor="$border"
      borderWidth="$px"
    >
      {verifyStateViewMemo}
      <Stack flex={1}>
        {renderResultView(item, itemVerifyState)}
        {errorStateViewMemo}
      </Stack>
    </XStack>
  );
};

const TestItemViewMemo = memo(TestItemView);

export type TestRunnerResultViewProps = Omit<TestItemViewProps, 'item'>;

// eslint-disable-next-line react/prop-types
export function TestRunnerResultView({ renderResultView }: TestRunnerResultViewProps) {
  const { itemValues } = useContext(TestRunnerContext);

  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: TestCaseDataWithKey }) => (
      <TestItemViewMemo renderResultView={renderResultView} item={item} />
    ),
    [renderResultView]
  );

  return (
    <FlatList<TestCaseDataWithKey>
      data={itemValues}
      renderItem={renderItem}
      keyExtractor={item => item.$key}
      contentContainerStyle={{ width: '100%' }}
    />
  );
}
