import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Group, H4, Stack, Text } from 'tamagui';
import PlaygroundExecutor, { type MethodPayload } from './PlaygroundExecutor';
import { useExpandMode } from '../provider/ExpandModeProvider';
import { Button } from './ui/Button';
import AutoExpandingTextArea from './ui/AutoExpandingTextArea';

export interface PresupposeProps {
  title: string;
  value: any; // JSON object
}

export type PlaygroundProps = {
  description: string;
  presupposes?: PresupposeProps[];
  deprecated?: boolean;
} & MethodPayload;

const Playground = ({
  method,
  description,
  presupposes,
  deprecated,
  noConnIdReq,
  noDeviceIdReq,
}: PlaygroundProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [params, setParams] = useState('');
  const [response, setResponse] = useState('');
  const paramsRef = useRef(params);
  const isExpandMode = useExpandMode();

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const fillParameterCallback = useCallback(
    (index: number) => () => {
      setParams(JSON.stringify(presupposes?.[index].value, null, 2));
    },
    [presupposes]
  );

  // Fill the first parameter by default
  useEffect(() => {
    if (presupposes && presupposes.length > 0) {
      fillParameterCallback(0)();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const HeaderView = useMemo(
    () => (
      <Stack
        padding="$2"
        height="$14"
        borderColor="$border"
        backgroundColor="$bgInfo"
        flexDirection="row"
        alignItems="center"
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <H4 fontWeight="bold" textDecorationLine={deprecated ? 'line-through' : 'none'}>
          {` ${!!isExpanded || !!isExpandMode ? '-' : '+'} ${method}`}
        </H4>
      </Stack>
    ),
    [deprecated, isExpandMode, isExpanded, method]
  );

  const PresupposeView = useMemo(() => {
    if (presupposes && presupposes.length > 0) {
      return (
        <>
          <Text fontSize={16} fontWeight="bold">
            Default parameters
          </Text>
          <Group orientation="horizontal" paddingHorizontal="$2" flexWrap="wrap">
            {presupposes.map((presuppose, index) => (
              <Group.Item>
                <Button key={presuppose.title} onPress={fillParameterCallback(index)}>
                  {presuppose.title}
                </Button>
              </Group.Item>
            ))}
          </Group>
        </>
      );
    }
    return null;
  }, [fillParameterCallback, presupposes]);

  const RequestParamsView = useMemo(
    () => (
      <>
        <Text fontSize={16} fontWeight="bold">
          Parameters
        </Text>
        <AutoExpandingTextArea
          marginHorizontal="$2"
          lineHeight={1}
          fontSize={14}
          minHeight={presupposes && presupposes.length > 0 ? 140 : 40}
          onChangeText={setParams}
          value={params}
          placeholder="Enter your parameters here..."
        />
      </>
    ),
    [params, presupposes]
  );

  const copyResponse = useCallback(() => {
    Clipboard.setStringAsync(response);
  }, [response]);

  const ResponseView = useMemo(
    () => (
      <Stack>
        <Stack flexDirection="row" justifyContent="space-between">
          <Text fontSize={16} fontWeight="bold" marginTop="$1">
            Response
          </Text>
          <Button onPress={copyResponse}>
            <Text color="$textInfo">Copy</Text>
          </Button>
        </Stack>
        <AutoExpandingTextArea
          marginHorizontal="$2"
          marginBottom="$2"
          lineHeight={1}
          fontSize={13}
          minHeight={350}
          onChangeText={setResponse}
          value={response}
          placeholder="Response will be shown here."
          editable={false}
        />
      </Stack>
    ),
    [copyResponse, response]
  );

  const onAcquireParams = useCallback(
    () => () => {
      try {
        return Promise.resolve(JSON.parse(paramsRef.current));
      } catch (error) {
        return Promise.resolve({});
      }
    },
    []
  );

  const PlaygroundExecutorView = useMemo(
    () => (
      <PlaygroundExecutor
        methodPayload={{
          method,
          noConnIdReq,
          noDeviceIdReq,
        }}
        onAcquireParams={onAcquireParams()}
        onExecute={setResponse}
      />
    ),
    [method, noConnIdReq, noDeviceIdReq, onAcquireParams]
  );

  return (
    <Stack borderWidth="$px" borderColor="$border" borderRadius="$2">
      {HeaderView}
      {(!!isExpanded || !!isExpandMode) && (
        <Stack gap="$2" paddingHorizontal="$2">
          <Text fontSize={14} paddingHorizontal="$2">
            {description}
          </Text>
          {PresupposeView}
          {RequestParamsView}
          {PlaygroundExecutorView}
          {ResponseView}
        </Stack>
      )}
    </Stack>
  );
};

export default Playground;
