import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Group, H4, Stack, Text } from 'tamagui';
import { useIntl } from 'react-intl';

import PlaygroundExecutor, { type MethodPayload } from './PlaygroundExecutor';
import { useExpandMode } from '../provider/ExpandModeProvider';
import { Button } from './ui/Button';
import AutoWrapperTextArea from './ui/AutoWrapperTextArea';
import { SwitchInput } from './SwitchInput';

export interface PresupposeProps {
  title: string;
  value: any; // JSON object
}

export interface CheckboxFieldProps {
  /** 参数 JSON 中的点分路径，例如 'targets.hw'、'types.build_id' */
  path: string;
  label: string;
}

export interface CheckboxGroupProps {
  title: string;
  fields: CheckboxFieldProps[];
}

export type PlaygroundProps = {
  description?: string;
  presupposes?: PresupposeProps[];
  /** 可选的布尔参数快捷开关；勾选状态与参数 JSON 双向同步 */
  checkboxGroups?: CheckboxGroupProps[];
  deprecated?: boolean;
} & MethodPayload;

const getValueAtPath = (obj: any, path: string): unknown =>
  path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const Playground = ({
  method,
  description,
  presupposes,
  checkboxGroups,
  deprecated,
  noConnIdReq,
  noDeviceIdReq,
}: PlaygroundProps) => {
  const intl = useIntl();
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

  const parsedParams = useMemo(() => {
    try {
      const value = JSON.parse(params);
      return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
    } catch (error) {
      return undefined;
    }
  }, [params]);

  const toggleCheckboxField = useCallback((path: string, checked: boolean) => {
    let payload: any;
    try {
      payload = JSON.parse(paramsRef.current);
    } catch (error) {
      payload = {};
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      payload = {};
    }

    const keys = path.split('.');
    let cursor = payload;
    for (let i = 0; i < keys.length - 1; i += 1) {
      if (!cursor[keys[i]] || typeof cursor[keys[i]] !== 'object') {
        cursor[keys[i]] = {};
      }
      cursor = cursor[keys[i]];
    }
    const leafKey = keys[keys.length - 1];
    if (checked) {
      cursor[leafKey] = true;
    } else {
      delete cursor[leafKey];
    }
    setParams(JSON.stringify(payload, null, 2));
  }, []);

  const CheckboxGroupsView = useMemo(() => {
    if (!checkboxGroups || checkboxGroups.length === 0) return null;
    return (
      <>
        {checkboxGroups.map(group => (
          <Stack key={`checkbox-group-${group.title}`} paddingHorizontal="$2">
            <Text fontSize={16} fontWeight="bold">
              {group.title}
            </Text>
            <Stack flexDirection="row" flexWrap="wrap">
              {group.fields.map(field => (
                <SwitchInput
                  key={`checkbox-${group.title}-${field.path}`}
                  vertical
                  label={field.label}
                  value={getValueAtPath(parsedParams, field.path) === true}
                  onToggle={checked => toggleCheckboxField(field.path, checked)}
                />
              ))}
            </Stack>
          </Stack>
        ))}
      </>
    );
  }, [checkboxGroups, parsedParams, toggleCheckboxField]);

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
          onChangeText={setParams}
          placeholder={intl.formatMessage({ id: 'label__enter_parameters_tip' })}
        />
      </>
    ),
    [intl, params, presupposes]
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
          {CheckboxGroupsView}
          {RequestParamsView}
          {PlaygroundExecutorView}
          {ResponseView}
        </Stack>
      )}
    </Stack>
  );
};

export default Playground;
