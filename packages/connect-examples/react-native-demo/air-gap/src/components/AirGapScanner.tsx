import { Buffer } from 'buffer';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { airGapUrUtils, AirGapUR } from '../../sdk';

interface AirGapScannerProps {
  visible: boolean;
  onClose: () => void;
  onDecoded: (ur: AirGapUR) => void;
}

type AnimatedDecoder = ReturnType<typeof airGapUrUtils.createAnimatedURDecoder> | null;

type ScanProgress = {
  seen: number;
  total?: number;
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerAction: {
    color: '#93C5FD',
    fontSize: 14,
  },
  infoPanel: {
    marginTop: 12,
    alignItems: 'center',
  },
  infoText: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  requestButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  requestText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

function parseSequenceHint(data: string) {
  const match = data.match(/\/(\d+)OF(\d+)/i);
  if (!match) {
    return null;
  }
  const index = Number(match[1]);
  const total = Number(match[2]);
  if (Number.isNaN(index) || Number.isNaN(total)) {
    return null;
  }
  return { index, total };
}

export const AirGapScanner = ({ visible, onClose, onDecoded }: AirGapScannerProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const decoderRef = useRef<AnimatedDecoder>(null);
  const [progress, setProgress] = useState<ScanProgress>({ seen: 0 });
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const requestCameraPermission = useCallback(() => {
    requestPermission().catch(err => {
      console.warn('Failed to request camera permission', err);
    });
  }, [requestPermission]);

  useEffect(() => {
    if (!visible) {
      decoderRef.current?.abort?.();
      decoderRef.current = null;
      setProgress({ seen: 0 });
      setIsCompleted(false);
      setError(null);
      setScannerEnabled(true);
      return;
    }

    decoderRef.current = airGapUrUtils.createAnimatedURDecoder();
    return () => {
      decoderRef.current?.abort?.();
      decoderRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    if (visible && permission && permission.status !== 'granted') {
      requestCameraPermission();
    }
  }, [permission, requestCameraPermission, visible]);

  const handleBarCodeScanned = ({ data }: { data?: string }) => {
    if (!decoderRef.current || isCompleted) {
      return;
    }
    const cleaned = data?.trim() ?? '';
    if (!cleaned) {
      return;
    }
    if (!cleaned.toLowerCase().startsWith('ur:')) {
      try {
        setError(null);
        setScannerEnabled(false);
        const plainTextUr = new AirGapUR(Buffer.from(cleaned, 'utf8'), 'plain-text');
        decoderRef.current.abort?.();
        decoderRef.current = null;
        setProgress({ seen: 1, total: 1 });
        setIsCompleted(true);
        onDecoded(plainTextUr);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to decode QR payload.');
      }
      return;
    }
    const hint = parseSequenceHint(cleaned);
    setError(null);
    try {
      decoderRef.current.receivePart?.(cleaned);
      setProgress(prev => ({
        seen: prev.seen + 1,
        total: hint?.total ?? prev.total,
      }));
      if (decoderRef.current.decoder.isComplete()) {
        setScannerEnabled(false);
        const decoder = decoderRef.current;
        decoderRef.current = null;
        const ur = decoder.decoder.resultUR();
        setIsCompleted(true);
        onDecoded(ur);
        onClose();
        decoder.abort?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decode QR payload.');
    }
  };

  const permissionGranted = permission?.granted;
  const hintText = useMemo(() => {
    if (error) {
      return `Decoding issue: ${error}`;
    }
    if (progress.total) {
      return `Captured ${progress.seen} / ${progress.total} frames. Keep the QR code aligned with the viewfinder.`;
    }
    if (progress.seen > 0) {
      return `Captured ${progress.seen} frame(s). Waiting for additional parts to finish assembly.`;
    }
    return 'Hold the QR code inside the frame. Animated multi-frame payloads are supported.';
  }, [error, progress.seen, progress.total]);

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.headerAction}>Close</Text>
          </Pressable>
        </View>
        {permissionGranted ? (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scannerEnabled ? handleBarCodeScanned : undefined}
            />
            <View style={styles.footer}>
              <View style={styles.infoPanel}>
                <ActivityIndicator animating size="small" color="#93C5FD" />
                <Text style={styles.infoText}>{hintText}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.camera, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.permissionText}>
              Camera permission is required before scanning QR codes.
            </Text>
            <Pressable style={styles.requestButton} onPress={requestCameraPermission}>
              <Text style={styles.requestText}>Grant permission</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};
