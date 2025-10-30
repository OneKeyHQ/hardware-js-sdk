import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAnimatedQrPlayer } from '../hooks/useAnimatedQrPlayer';

interface AnimatedQrViewProps {
  title: string;
  parts: string[];
  fallbackValue?: string;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  qrWrapper: {
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  meta: {
    marginTop: 12,
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },
  toolbar: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2563EB',
    marginHorizontal: 6,
  },
  buttonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '500',
  },
});

export const AnimatedQrView = memo(({ title, parts, fallbackValue }: AnimatedQrViewProps) => {
  const sanitized = useMemo(() => {
    if (parts.length > 0) {
      return parts;
    }
    if (fallbackValue) {
      return [fallbackValue];
    }
    return [];
  }, [fallbackValue, parts]);
  const player = useAnimatedQrPlayer(sanitized);
  const showToolbar = sanitized.length > 1;
  const value = player.currentFrame || fallbackValue || 'UR:NULL';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.qrWrapper}>
        <QRCode value={value} size={240} backgroundColor="#F9FAFB" color="#111827" />
      </View>
      {showToolbar ? (
        <Text style={styles.meta}>
          {`Showing frame ${player.index + 1} / ${player.total}, `}
          {player.isPlaying ? 'auto playback in progress' : 'paused'}
        </Text>
      ) : (
        <Text style={styles.meta}>This payload fits in a single QR frame.</Text>
      )}
      {showToolbar ? (
        <View style={styles.toolbar}>
          <Pressable style={styles.button} onPress={player.showPrev}>
            <Text style={styles.buttonText}>Prev frame</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={player.toggle}>
            <Text style={styles.buttonText}>{player.isPlaying ? 'Pause' : 'Resume'}</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={player.showNext}>
            <Text style={styles.buttonText}>Next frame</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});
AnimatedQrView.displayName = 'AnimatedQrView';
