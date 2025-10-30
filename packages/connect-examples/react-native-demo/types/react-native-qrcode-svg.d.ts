declare module 'react-native-qrcode-svg' {
  import type { Component, Ref } from 'react';
  import type { ViewStyle } from 'react-native';

  export interface QRCodeProps {
    value: string;
    size?: number;
    logo?: string | number;
    logoSize?: number;
    backgroundColor?: string;
    color?: string;
    ecl?: 'L' | 'M' | 'Q' | 'H';
    enableLinearGradient?: boolean;
    linearGradient?: string[];
    getRef?: (ref: Ref<any>) => void;
    quietZone?: number;
    logoBackgroundColor?: string;
    style?: ViewStyle;
    drawType?: 'square' | 'dot' | 'line';
    valueUr?: { type: string; cbor: string };
  }

  export default class QRCode extends Component<QRCodeProps> {}
}
