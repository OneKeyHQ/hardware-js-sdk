import './src/polyfills';

/* eslint-disable react/style-prop-object */
import { StatusBar } from 'expo-status-bar';
/* eslint-enable react/style-prop-object */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { features } from './src/features';
import { FeatureStateProvider } from './src/features/state';

type FeatureTabProps = {
  title: string;
  hint?: string;
  isActive: boolean;
  onPress: () => void;
};

const PillTab = ({ title, hint, isActive, onPress }: FeatureTabProps) => (
  <Pressable
    onPress={onPress}
    style={[styles.tabItem, isActive && styles.tabItemActive]}
    accessibilityRole="tab"
    accessibilityState={{ selected: isActive }}
  >
    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{title}</Text>
    {hint ? (
      <Text style={[styles.tabHint, isActive && styles.tabHintActive]} numberOfLines={1}>
        {hint}
      </Text>
    ) : null}
  </Pressable>
);

const AppShell = () => {
  const availableFeatures = useMemo(() => features, []);
  const [activeId, setActiveId] = useState<string>(availableFeatures[0]?.id ?? '');

  const activeFeature =
    availableFeatures.find(item => item.id === activeId) ?? availableFeatures[0];
  const FeatureScreen = activeFeature?.Screen ?? null;

  const resolveFeatureLabel = useCallback((featureId: string) => featureId.replace(/-/g, ' '), []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar />
        <View style={styles.body}>{FeatureScreen ? <FeatureScreen /> : null}</View>

        <SafeAreaView edges={['left', 'right']} style={styles.tabSafeArea}>
          <View style={styles.tabBarWrapper}>
            <View style={styles.tabBar}>
              {availableFeatures.map(feature => (
                <PillTab
                  key={feature.id}
                  title={resolveFeatureLabel(feature.id)}
                  isActive={activeFeature?.id === feature.id}
                  onPress={() => setActiveId(feature.id)}
                />
              ))}
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <FeatureStateProvider>
      <AppShell />
    </FeatureStateProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  body: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabSafeArea: {
    backgroundColor: '#FFFFFF',
  },
  tabBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 6,
    gap: 6,
    shadowColor: '#1F2937',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: '#E0E7FF',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  tabLabelActive: {
    color: '#1D4ED8',
  },
  tabHint: {
    fontSize: 11,
    color: '#6B7280',
  },
  tabHintActive: {
    color: '#4338CA',
  },
});
