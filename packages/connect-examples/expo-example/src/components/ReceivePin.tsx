import React from 'react';
import { View, TextInput, Text, Button, Platform } from 'react-native';

type IReceivePinProps = {
  value: string;
  onChange: (value: string) => void;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export function ReceivePin({ value, onChange, onConfirm, onCancel }: IReceivePinProps) {
  return (
    <View style={{ maxWidth: 300 }}>
      <Text style={{ fontSize: 24 }}>Input Pin</Text>
      <TextInput
        style={{
          height: 40,
          borderColor: 'gray',
          borderWidth: 1,
          padding: Platform.OS === 'web' ? 16 : 0,
          margin: 12,
        }}
        onChangeText={text => onChange(text)}
        value={value}
      />
      <Button title="confirm" onPress={() => onConfirm(value)} />
      <Button title="cancel" onPress={onCancel} />
    </View>
  );
}
