import React from 'react';
import { View, TextInput, Text, Button } from 'react-native';

type IReceivePinProps = {
  value: string;
  onChange: (value: string) => void;
  onConfirm: (value: string) => void;
};

export function ReceivePin({ value, onChange, onConfirm }: IReceivePinProps) {
  return (
    <View style={{ maxWidth: 300 }}>
      <Text style={{ fontSize: 24 }}>Input Pin</Text>
      <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1, padding: 16, margin: 12 }}
        onChangeText={text => onChange(text)}
        value={value}
      />
      <Button title="confirm" onPress={() => onConfirm(value)} />
    </View>
  );
}
