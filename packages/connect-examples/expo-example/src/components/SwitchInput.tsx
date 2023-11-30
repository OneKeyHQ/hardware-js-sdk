import { StyleSheet, Switch, Text, View } from 'react-native';

export type SwitchInputProps = {
  value: boolean;
  onToggle: (value: boolean) => void;
  label: string;
};
export const SwitchInput = ({ value, onToggle, label }: SwitchInputProps) => (
  <View style={styles.commonParamItem}>
    <Text style={styles.label}>{label}</Text>
    <Switch value={value} onValueChange={onToggle} />
  </View>
);
const styles = StyleSheet.create({
  commonParamItem: {
    marginBottom: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 14,
  },
});
