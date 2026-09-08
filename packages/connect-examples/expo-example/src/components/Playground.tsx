import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Group, H4, Stack, Text } from 'tamagui';
import { useIntl } from 'react-intl';

import PlaygroundExecutor, { type MethodPayload } from './PlaygroundExecutor';
import { useExpandMode } from '../provider/ExpandModeProvider';
import { Button } from './ui/Button';
import AutoWrapperTextArea from './ui/AutoWrapperTextArea';
import { acquireEditorParams, preparePresetEditor } from '../utils/presetEditor';

export interface PresupposeProps {
  title: string;
  value: any; // JSON object
}

export type PlaygroundProps = {
  description?: string;
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
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const [params, setParams] = useState('');
  const [hasOversizedPreset, setHasOversizedPreset] = useState(false);
  const [response, setResponse] = useState('');
  const paramsRef = useRef(params);
  const oversizedPresetRef = useRef<object | null>(null);
  const isExpandMode = useExpandMode();

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const fillParameterCallback = useCallback(
    (index: number) => () => {
      const preset = presupposes?.[index];
      if (!preset) return;

      const preparedPreset = preparePresetEditor(preset);
      oversizedPresetRef.current = preparedPreset.oversizedPreset;
      paramsRef.current = preparedPreset.editorValue;
      setHasOversizedPreset(preparedPreset.isOversized);
      setParams(preparedPreset.editorValue);
    },
    [presupposes]
  );

  const handleParamsChange = useCallback((value: string) => {
    oversizedPresetRef.current = null;
    paramsRef.current = value;
    setHasOversizedPreset(false);
    setParams(value);
  }, []);

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
            {intl.formatMessage({ id: 'label__default_parameters' })}
          </Text>
          <Group orientation="horizontal" paddingHorizontal="$2" flexWrap="wrap">
            {presupposes.map((presuppose, index) => (
              <Group.Item key={`presuppose-${presuppose.title}-${index}`}>
                <Button onPress={fillParameterCallback(index)}>{presuppose.title}</Button>
              </Group.Item>
            ))}
          </Group>
        </>
      );
    }
    return null;
  }, [fillParameterCallback, intl, presupposes]);

  const RequestParamsView = useMemo(
    () => (
      <>
        <Text fontSize={16} fontWeight="bold">
          {intl.formatMessage({ id: 'label__parameters' })}
        </Text>
        <AutoWrapperTextArea
          marginHorizontal="$2"
          minHeight={presupposes && presupposes.length > 0 ? 140 : 40}
          maxHeight={320}
          value={params}
          onChangeText={handleParamsChange}
          placeholder={intl.formatMessage({ id: 'label__enter_parameters_tip' })}
          editable={!hasOversizedPreset}
        />
      </>
    ),
    [handleParamsChange, hasOversizedPreset, intl, params, presupposes]
  );

  const copyResponse = useCallback(() => {
    Clipboard.setStringAsync(response);
  }, [response]);

  const ResponseView = useMemo(
    () => (
      <Stack>
        <Stack flexDirection="row" justifyContent="space-between">
          <Text fontSize={16} fontWeight="bold" marginTop="$1">
            {intl.formatMessage({ id: 'label__response' })}
          </Text>
          <Button onPress={copyResponse}>
            <Text color="$textInfo"> {intl.formatMessage({ id: 'action__copy' })}</Text>
          </Button>
        </Stack>
        <AutoWrapperTextArea
          marginTop="$2"
          marginHorizontal="$2"
          marginBottom="$2"
          value={response}
          onChangeText={setResponse}
          placeholder={intl.formatMessage({ id: 'label__will_response_tip' })}
          editable={false}
        />
      </Stack>
    ),
    [copyResponse, intl, response]
  );

  const onAcquireParams = useCallback(
    () => () => Promise.resolve(acquireEditorParams(paramsRef.current, oversizedPresetRef.current)),
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
