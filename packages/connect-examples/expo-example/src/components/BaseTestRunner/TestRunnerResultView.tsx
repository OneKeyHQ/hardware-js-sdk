import { memo, useCallback, useContext, useEffect, useMemo } from 'react';
import { Stack, Text, XStack, YStack } from 'tamagui';
import { useAtomValue } from 'jotai';
import { FlatList } from 'react-native';

import { selectedItemVerifyStateAtom as createSelectedItemVerifyStateAtom } from './Context/TestRunnerVerifyProvider';
import { TestRunnerContext } from './Context/TestRunnerProvider';

import type { TestCaseDataWithKey } from './types';
import type { ItemVerifyState, createTestRunnerAtoms } from './Context/TestRunnerVerifyProvider';

// 自定义状态管理器类型
type CustomStateManager = ReturnType<typeof createTestRunnerAtoms>;

type TestRunnerItem<TCaseData> = TCaseData extends Array<infer TItem> ? TItem : TCaseData;

export type TestItemViewProps<TCaseData = any, TExt = unknown> = {
  item: TestCaseDataWithKey<TestRunnerItem<TCaseData>>;
  renderResultView: (
    item: TestCaseDataWithKey<TestRunnerItem<TCaseData>>,
    itemVerifyState: ItemVerifyState<TExt>
  ) => React.ReactNode;
  stateManager?: CustomStateManager;
};

const TestItemView = <TCaseData, TExt>({
  item,
  renderResultView,
  stateManager,
}: TestItemViewProps<TCaseData, TExt>) => {
  const selectedItemVerifyStateAtom = useMemo(
    () =>
      stateManager
        ? stateManager.selectedItemVerifyStateAtom(item.$key)
        : createSelectedItemVerifyStateAtom(item.$key),
    [item.$key, stateManager]
  );
  const itemVerifyState = useAtomValue(selectedItemVerifyStateAtom);
  const typedItemVerifyState = itemVerifyState as ItemVerifyState<TExt>;

  const verifyState = useMemo(() => typedItemVerifyState?.verify ?? 'none', [typedItemVerifyState]);
  const errorState = useMemo(() => typedItemVerifyState?.error ?? '', [typedItemVerifyState]);

  const errorStateViewMemo = useMemo(() => {
    // 🎯 如果是跳过状态，不显示错误信息
    if (!errorState || verifyState === 'skip') return null;
    return (
      <Text fontSize={14} color="red">
        error: {errorState}
      </Text>
    );
  }, [errorState, verifyState]);

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
        {renderResultView(item, typedItemVerifyState)}
        {errorStateViewMemo}
      </Stack>
    </XStack>
  );
};

const TestItemViewMemo = memo(TestItemView) as typeof TestItemView;

export type TestRunnerResultViewProps<TItemData = any, TExt = unknown> = Omit<
  TestItemViewProps<TItemData, TExt>,
  'item'
>;

// eslint-disable-next-line react/prop-types
export function TestRunnerResultView<TCaseData = any, TExt = unknown>({
  renderResultView, // eslint-disable-line react/prop-types
  stateManager, // eslint-disable-line react/prop-types
}: TestRunnerResultViewProps<TCaseData, TExt>) {
  const { itemValues } = useContext(TestRunnerContext);
  const typedItemValues = itemValues as TestCaseDataWithKey<TestRunnerItem<TCaseData>>[];

  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: TestCaseDataWithKey<TestRunnerItem<TCaseData>> }) => (
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
      <FlatList<TestCaseDataWithKey<TestRunnerItem<TCaseData>>>
        data={typedItemValues}
        renderItem={renderItem}
        keyExtractor={item => item.$key}
        contentContainerStyle={{ width: '100%' }}
      />
    </YStack>
  );
}
