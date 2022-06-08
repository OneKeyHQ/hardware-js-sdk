import React, { useState } from 'react';
import { View, TextInput, Text, Button } from 'react-native';

export function ReceivePin() {
  const [value, onChangeText] = useState('');

  return (
    <View style={{ maxWidth: 300 }}>
      <Text style={{ fontSize: 24 }}>Input Pin</Text>
      <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1, padding: 16, margin: 12 }}
        onChangeText={text => onChangeText(text)}
        value={value}
      />
      <Button title="confirm" onPress={() => {}} />
    </View>
  );
}
