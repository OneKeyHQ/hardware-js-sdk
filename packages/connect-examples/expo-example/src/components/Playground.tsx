import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import PlaygroundExecutor, { type MethodPayload } from './PlaygroundExecutor';
import { useExpandMode } from '../provider/ExpandModeProvider';

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
      <Text
        onPress={() => setIsExpanded(!isExpanded)}
        style={deprecated ? styles.deprecatedHeader : styles.header}
      >
        {` ${!!isExpanded || !!isExpandMode ? '-' : '+'} ${method}`}
      </Text>
    ),
    [deprecated, isExpandMode, isExpanded, method]
  );

  const PresupposeView = useMemo(() => {
    if (presupposes && presupposes.length > 0) {
      return (
        <>
          <Text style={styles.subheader}>Default parameters</Text>
          <View style={styles.features}>
            {presupposes.map((presuppose, index) => (
              <Button
                key={presuppose.title}
                title={presuppose.title}
                onPress={fillParameterCallback(index)}
              />
            ))}
          </View>
        </>
      );
    }
    return null;
  }, [fillParameterCallback, presupposes]);

  const RequestParamsView = useMemo(
    () => (
      <>
        <Text style={styles.subheader}>Parameters</Text>
        <TextInput
          style={presupposes && presupposes.length > 0 ? styles.input : styles.emptyInput}
          onChangeText={setParams}
          value={params}
          placeholder="Enter your parameters here..."
          multiline
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
      <>
        <View style={styles.subheader}>
          <Text style={styles.subheaderText}>Response</Text>
          <TouchableOpacity onPress={copyResponse}>
            <Text style={styles.copyButton}>Copy</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, styles.responseInput]}
          onChangeText={setResponse}
          value={response}
          placeholder="Response will be shown here."
          multiline
          editable={false}
        />
      </>
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
    <View style={styles.container}>
      {HeaderView}
      {(!!isExpanded || !!isExpandMode) && (
        <>
          <Text style={styles.description}>{description}</Text>
          {PresupposeView}
          {RequestParamsView}
          {PlaygroundExecutorView}
          {ResponseView}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  header: {
    fontWeight: 'bold',
    paddingVertical: 4,
    fontSize: 22,
  },
  deprecatedHeader: {
    fontWeight: 'bold',
    paddingVertical: 4,
    fontSize: 22,
    textDecorationLine: 'line-through',
  },
  description: {
    padding: 8,
    fontSize: 12,
  },
  subheader: {
    paddingTop: 10,
    fontWeight: 'bold',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subheaderText: {
    fontWeight: 'bold',
  },
  copyButton: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  features: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
  },
  emptyInput: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 8,
    marginTop: 10,
    marginBottom: 10,
    fontSize: 14,
    borderRadius: 4,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 8,
    marginTop: 10,
    marginBottom: 10,
    fontSize: 14,
    borderRadius: 4,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  responseInput: {
    backgroundColor: '#f7f7f7',
  },
});

export default Playground;
