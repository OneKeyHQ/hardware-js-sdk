import { useCallback } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export type CommonInputProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  type?: 'number' | 'text';
};
export const CommonInput = ({ value, onChange, label, type }: CommonInputProps) => {
  const onChangeCallback = useCallback(
    (text: string) => {
      if (type === 'number') {
        onChange(text.replace(/[^\d]+/, ''));
      } else {
        onChange(text);
      }
    },
    [onChange, type]
  );

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={value}
        onChangeText={onChangeCallback}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  input: {
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
    margin: 2,
    fontSize: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 14,
  },
});
