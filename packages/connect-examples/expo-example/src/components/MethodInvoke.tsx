import React, { FC, useState } from 'react';
import { View, Button, StyleSheet, Text, TextInput, Switch } from 'react-native';

export type Option = {
  name: string;
  value: string | boolean | number | undefined;
  type: 'string' | 'boolean' | 'number';
};

export type MethodInvokeProps = {
  title: string;
  options: Option[];
  onCall: (data: object) => Promise<any>;
};

const MethodInvoke: FC<MethodInvokeProps> = ({ title, options, onCall }) => {
  const [data, setData] = useState(options);
  const [result, setResult] = useState('');
  const [resultSuccess, setResultSUccess] = useState(undefined);

  const onSubmit = async () => {
    const callData = {};

    data.forEach(item => {
      let { value } = item;
      if (value === '') {
        value = undefined;
      }

      let currCallData: any = callData;
      if (item.name.includes('.')) {
        const split = item.name.split('.');
        split.forEach((key, index) => {
          if (index === split.length - 1) {
            currCallData[key] = value;
          } else {
            if (!currCallData[key]) {
              currCallData[key] = {};
            }
            currCallData = currCallData[key];
          }
        });
      } else {
        currCallData[item.name] = value;
      }
    });

    const res = await onCall(callData);
    setResultSUccess(res.success);
    setResult(JSON.stringify(res));
  };

  const onChange = ({ name, value }: { name: string; value: any }) => {
    setData(prevState => {
      const newData = [...prevState];
      const index = newData.findIndex(item => item.name === name);
      if (index !== -1) {
        const currItem = newData[index];
        if (currItem.type === 'boolean') {
          newData[index] = { ...currItem, value };
        } else {
          newData[index] = { ...currItem, value };
        }
      }
      return newData;
    });
  };

  const renderItem = ({ item }: { item: Option }) => {
    if (item.type === 'boolean') {
      return (
        <Switch value={!!item.value} onValueChange={v => onChange({ name: item.name, value: v })} />
      );
    }
    if (item.type === 'number') {
      // TODO Limit input to numbers only
      return (
        <TextInput
          style={styles.input}
          value={item.value?.toString() ?? ''}
          onChangeText={v => onChange({ name: item.name, value: v })}
        />
      );
    }
    return (
      <TextInput
        style={styles.input}
        value={item.value?.toString() ?? ''}
        onChangeText={v => onChange({ name: item.name, value: v })}
      />
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>{title}</Text>
      <View style={styles.cardContent}>
        {data.map((item, index) => (
          <View key={index} style={styles.inputItem}>
            <Text>{item.name}</Text>
            {renderItem({ item })}
          </View>
        ))}

        <View style={styles.inputItem}>
          <View style={{ flexDirection: 'row' }}>
            <Text>Result: </Text>
            {!!resultSuccess && <Text style={styles.success}>Success</Text>}
            {resultSuccess === false && <Text style={styles.failure}>Failure</Text>}
          </View>
          <TextInput style={styles.inputResult} value={result} />
        </View>
      </View>
      <Button title="Submit" onPress={onSubmit} />
    </View>
  );
};

export default MethodInvoke;

const styles = StyleSheet.create({
  success: {
    color: '#00ff00',
  },
  failure: {
    color: '#ff0000',
  },
  card: {
    flexDirection: 'column',
    borderRadius: 12,
    borderColor: '#cccccc',
    borderWidth: 1,
    overflow: 'hidden',
    margin: 12,
    height: 'auto',
  },
  cardHeader: {
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
  },
  cardFooter: {
    width: '100%',
    padding: 8,
    cursor: 'pointer',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#cccccc',
  },
  cardContent: {
    padding: 4,
    flex: 1,
  },
  inputItem: {
    flexDirection: 'column',
    padding: 4,
  },
  input: {
    height: 35,
    margin: 4,
    borderWidth: 1,
    padding: 8,
  },
  inputResult: {
    height: 80,
    margin: 4,
    borderWidth: 1,
    padding: 8,
  },
});
