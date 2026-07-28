import './src/polyfills';

/* eslint-disable react/style-prop-object */
import { StatusBar } from 'expo-status-bar';
/* eslint-enable react/style-prop-object */
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { features } from './src/features';
import { FeatureStateProvider, useFeatureStateManager } from './src/features/state';
import type { FeatureDescriptor } from './src/features/types';

const MANAGE_TAB_ID = '__manage';

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

const ManageScreen = ({ featuresMap }: { featuresMap: Map<string, FeatureDescriptor> }) => {
  const { state, hydrated, clearFeature, clearAll } = useFeatureStateManager();
  const entries = useMemo(() => Object.entries(state), [state]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (featureId: string) => {
    setExpanded(prev => ({ ...prev, [featureId]: !prev[featureId] }));
  };

  const renderEntries = () => {
    if (!hydrated) {
      return <Text style={styles.managePlaceholder}>Loading cache…</Text>;
    }
    if (entries.length === 0) {
      return (
        <Text style={styles.managePlaceholder}>
          No cached records yet. Interact with a demo to store sample data.
        </Text>
      );
    }

    return entries.map(([featureId, payload]) => {
      const feature = featuresMap.get(featureId);
      const isExpanded = expanded[featureId] ?? true;
      return (
        <View key={featureId} style={styles.manageSection}>
          <Pressable style={styles.manageSectionHeader} onPress={() => toggleExpanded(featureId)}>
            <View>
              <Text style={styles.manageSectionTitle}>{feature?.title ?? featureId}</Text>
              <Text style={styles.manageSectionSubtitle}>{featureId}</Text>
            </View>
            <Text style={styles.manageSectionToggle}>{isExpanded ? 'Hide' : 'Show'}</Text>
          </Pressable>
          {isExpanded ? (
            <View style={styles.manageSectionBody}>
              <Text style={styles.manageCode}>{JSON.stringify(payload, null, 2)}</Text>
              <Pressable style={styles.manageSectionClear} onPress={() => clearFeature(featureId)}>
                <Text style={styles.manageSectionClearText}>Clear this demo</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      );
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.manageScreen} showsVerticalScrollIndicator={false}>
      <View style={styles.manageHeaderRow}>
        <View>
          <Text style={styles.manageTitle}>Cached demo data</Text>
          <Text style={styles.manageSubtitle}>
            Review and reset payloads generated across demo modules.
          </Text>
        </View>
        <Pressable
          style={[styles.manageClearAll, entries.length === 0 && styles.manageClearAllDisabled]}
          onPress={clearAll}
          disabled={entries.length === 0}
        >
          <Text style={styles.manageClearAllText}>Clear all</Text>
        </Pressable>
      </View>

      {renderEntries()}
    </ScrollView>
  );
};

const AppShell = () => {
  const availableFeatures = useMemo(() => features, []);
  const [activeId, setActiveId] = useState<string>(availableFeatures[0]?.id ?? MANAGE_TAB_ID);

  const isManageActive = activeId === MANAGE_TAB_ID;
  const activeFeature = availableFeatures.find(item => item.id === activeId);
  const FeatureScreen = activeFeature?.Screen ?? null;

  const featuresMap = useMemo(
    () => new Map(availableFeatures.map(item => [item.id, item])),
    [availableFeatures]
  );
  const resolveFeatureLabel = useCallback((featureId: string) => featureId.replace(/-/g, ' '), []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar />
        <View style={styles.body}>
          {isManageActive && <ManageScreen featuresMap={featuresMap} />}
          {!isManageActive && FeatureScreen ? <FeatureScreen /> : null}
        </View>

        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.tabSafeArea}>
          <View style={styles.tabBarWrapper}>
            <View style={styles.tabBar}>
              {availableFeatures.map(feature => (
                <PillTab
                  key={feature.id}
                  title={resolveFeatureLabel(feature.id)}
                  isActive={!isManageActive && activeFeature?.id === feature.id}
                  onPress={() => setActiveId(feature.id)}
                />
              ))}
              <PillTab
                title="Setting"
                isActive={isManageActive}
                onPress={() => setActiveId(MANAGE_TAB_ID)}
              />
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
    backgroundColor: 'transparent',
  },
  tabBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
  manageScreen: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  manageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  manageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  manageSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  manageClearAll: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
  },
  manageClearAllDisabled: {
    opacity: 0.4,
  },
  manageClearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
  managePlaceholder: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  manageSection: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  manageSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  manageSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  manageSectionSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
  },
  manageSectionToggle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  manageSectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  manageCode: {
    fontSize: 12,
    color: '#111827',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'Menlo',
    }),
  },
  manageSectionClear: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  manageSectionClearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
  },
});
