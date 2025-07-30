import { memo, useContext, useEffect, useMemo, useCallback } from 'react';

import { Stack, Text, XStack, YStack } from 'tamagui';
import { useAtomValue } from 'jotai';
import { FlatList } from 'react-native';

import { TestCaseDataWithKey } from './types';
import {
  ItemVerifyState,
  selectedItemVerifyStateAtom as createSelectedItemVerifyStateAtom,
  createTestRunnerAtoms,
} from './Context/TestRunnerVerifyProvider';
import { TestRunnerContext } from './Context/TestRunnerProvider';

// 自定义状态管理器类型
type CustomStateManager = ReturnType<typeof createTestRunnerAtoms>;

export type TestItemViewProps = {
  item: TestCaseDataWithKey;
  renderResultView: (
    item: TestCaseDataWithKey,
    itemVerifyState: ItemVerifyState
  ) => React.ReactNode;
  stateManager?: CustomStateManager;
};

const TestItemView = ({ item, renderResultView, stateManager }: TestItemViewProps) => {
  const selectedItemVerifyStateAtom = useMemo(
    () =>
      stateManager
        ? stateManager.selectedItemVerifyStateAtom(item.$key)
        : createSelectedItemVerifyStateAtom(item.$key),
    [item.$key, stateManager]
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
export function TestRunnerResultView({
  renderResultView, // eslint-disable-line react/prop-types
  stateManager, // eslint-disable-line react/prop-types
}: TestRunnerResultViewProps) {
  const { itemValues } = useContext(TestRunnerContext);

  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: TestCaseDataWithKey }) => (
      <TestItemViewMemo
        renderResultView={renderResultView}
        item={item}
        stateManager={stateManager}
      />
    ),
    [renderResultView, stateManager]
  );

  return (
    <YStack>
      <FlatList<TestCaseDataWithKey>
        data={itemValues}
        renderItem={renderItem}
        keyExtractor={item => item.$key}
        contentContainerStyle={{ width: '100%' }}
      />
    </YStack>
  );
}
