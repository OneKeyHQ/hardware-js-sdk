import React, { ReactNode, useContext, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useExpandMode } from '../provider/ExpandModeProvider';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const isExpandMode = useExpandMode();

  return (
    <View style={styles.section}>
      <Pressable style={styles.header} onPress={() => setIsCollapsed(!isCollapsed)}>
        <Text style={styles.title}>{title}</Text>
      </Pressable>
      {(!!isCollapsed || !!isExpandMode) && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: '#F5FCFF',
  },
  header: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 26,
  },
  content: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    gap: 10,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  section: {
    marginBottom: 10,
    overflow: 'hidden',
  },
});
