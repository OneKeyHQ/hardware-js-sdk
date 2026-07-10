import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ReactNode } from 'react';

type FeatureState = Record<string, Record<string, unknown>>;

type FeatureStateUpdater = (previous: FeatureState) => FeatureState;

interface FeatureStateContextValue {
  hydrated: boolean;
  state: FeatureState;
  updateState: (updater: FeatureStateUpdater) => void;
  clearFeature: (featureId: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = '@onekey-demo/feature-state';

const FeatureStateContext = createContext<FeatureStateContextValue | null>(null);

const persistState = async (value: FeatureState) => {
  try {
    if (Object.keys(value).length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  } catch (error) {
    console.warn('[FeatureState] persist failed', error);
  }
};

export const FeatureStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<FeatureState>({});
  const [hydrated, setHydrated] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && isMountedRef.current) {
          const parsed = JSON.parse(raw) as FeatureState;
          setState(parsed);
        }
      } catch (error) {
        console.warn('[FeatureState] hydrate failed', error);
      } finally {
        if (isMountedRef.current) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateState = useCallback((updater: FeatureStateUpdater) => {
    setState(prev => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  }, []);

  const clearFeature = useCallback(
    (featureId: string) => {
      updateState(prev => {
        if (!prev[featureId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[featureId];
        return next;
      });
    },
    [updateState]
  );

  const clearAll = useCallback(() => {
    setState({});
    persistState({});
  }, []);

  const contextValue = useMemo<FeatureStateContextValue>(
    () => ({
      hydrated,
      state,
      updateState,
      clearFeature,
      clearAll,
    }),
    [hydrated, state, updateState, clearFeature, clearAll]
  );

  return (
    <FeatureStateContext.Provider value={contextValue}>{children}</FeatureStateContext.Provider>
  );
};

const useFeatureStateContext = () => {
  const value = useContext(FeatureStateContext);
  if (!value) {
    throw new Error('useFeatureStateContext must be used within FeatureStateProvider');
  }
  return value;
};

type Updater<T> = T | ((previous: T) => T);

export const useFeatureStorage = <T,>(
  featureId: string,
  key: string,
  defaultValue: T
): [T, (value: Updater<T>) => void, () => void, boolean] => {
  const { state, hydrated, updateState } = useFeatureStateContext();

  const value = useMemo<T>(() => {
    const stored = state[featureId]?.[key];
    if (stored === undefined) {
      return defaultValue;
    }
    return stored as T;
  }, [state, featureId, key, defaultValue]);

  const setValue = useCallback(
    (input: Updater<T>) => {
      updateState(prev => {
        const prevFeature = prev[featureId] ?? {};
        const previousValue =
          (prevFeature[key] as T | undefined) !== undefined
            ? (prevFeature[key] as T)
            : defaultValue;

        const resolvedValue =
          typeof input === 'function' ? (input as (prevState: T) => T)(previousValue) : input;

        return {
          ...prev,
          [featureId]: {
            ...prevFeature,
            [key]: resolvedValue,
          },
        };
      });
    },
    [updateState, featureId, key, defaultValue]
  );

  const clearValue = useCallback(() => {
    updateState(prev => {
      const prevFeature = prev[featureId];
      if (!prevFeature || !(key in prevFeature)) {
        return prev;
      }
      const nextFeature = { ...prevFeature };
      delete nextFeature[key];
      const next = { ...prev };
      if (Object.keys(nextFeature).length > 0) {
        next[featureId] = nextFeature;
      } else {
        delete next[featureId];
      }
      return next;
    });
  }, [updateState, featureId, key]);

  return [value, setValue, clearValue, hydrated];
};

export const useFeatureStateManager = () => {
  const { state, hydrated, clearFeature, clearAll } = useFeatureStateContext();
  return { state, hydrated, clearFeature, clearAll };
};
