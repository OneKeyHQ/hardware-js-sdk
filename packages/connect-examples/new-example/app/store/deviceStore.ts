import { create } from "zustand";
import { DeviceInfo, LogEntry, ApiResponse } from "../types/hardware";
import { TransportType } from "../services/hardwareService";
import {
  isClassicModelDevice,
  isTouchModelDevice,
} from "../utils/deviceTypeUtils";
import type { IDeviceType, Features } from "@onekeyfe/hd-core";
import {
  UiEvent,
  getDeviceFirmwareVersion,
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceLabel,
  getDeviceUUID,
} from "@onekeyfe/hd-core";

// 设备动作状态
export interface DeviceActionState {
  isActive: boolean;
  actionType: UiEvent["type"] | null;
  deviceInfo?: Record<string, unknown>;
  startTime?: number;
}

// SDK初始化状态
export interface SDKInitializationState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  lastInitTime?: number;
}

interface DeviceState {
  // Connection types
  connectionType: string;
  transportType: TransportType;
  setConnectionType: (type: string) => void;
  setTransportType: (type: TransportType) => void;

  // SDK initialization state
  sdkInitState: SDKInitializationState;
  setSdkInitState: (state: Partial<SDKInitializationState>) => void;
  updateSdkInitState: (updates: Partial<SDKInitializationState>) => void;

  // Device management
  connectedDevices: DeviceInfo[];
  currentDevice: DeviceInfo | null;
  deviceFeatures: Features | undefined;
  isConnecting: boolean;

  // Device action state for lottie animations
  deviceAction: DeviceActionState;
  setDeviceAction: (action: DeviceActionState) => void;
  clearDeviceAction: () => void;

  // Actions
  setConnectedDevices: (devices: DeviceInfo[]) => void;
  setCurrentDevice: (device: DeviceInfo | null) => void;
  setDeviceFeatures: (features: Features | undefined) => void;
  setIsConnecting: (isConnecting: boolean) => void;

  // Response and logs
  lastResponse: ApiResponse | null;
  logs: LogEntry[];

  // Response and log management
  setLastResponse: (response: ApiResponse | null) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;

  // Device type helpers
  getCurrentDeviceType: () => IDeviceType | null;
  isCurrentDeviceClassicModel: () => boolean;
  isCurrentDeviceTouchModel: () => boolean;
  getCurrentDeviceFirmwareVersion: () => [number, number, number] | null;
  getCurrentDeviceBLEVersion: () => [number, number, number] | null;
  getCurrentDeviceBootloaderVersion: () => [number, number, number] | null;
  getCurrentDeviceLabel: () => string | null;
  getCurrentDeviceUUID: () => string | null;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  // Default state
  connectionType: "WebUSB",
  transportType: "webusb",
  connectedDevices: [],
  currentDevice: null,
  deviceFeatures: undefined,
  isConnecting: false,
  lastResponse: null,
  logs: [],
  deviceAction: {
    isActive: false,
    actionType: null,
  },
  sdkInitState: {
    isInitialized: false,
    isInitializing: false,
    error: null,
  },

  // Actions
  setConnectionType: (type: string) => set({ connectionType: type }),
  setTransportType: (type: TransportType) => set({ transportType: type }),
  setConnectedDevices: (devices: DeviceInfo[]) =>
    set({ connectedDevices: devices }),
  setCurrentDevice: (device: DeviceInfo | null) =>
    set({ currentDevice: device }),
  setDeviceFeatures: (features: Features | undefined) =>
    set({ deviceFeatures: features }),
  setIsConnecting: (isConnecting: boolean) => set({ isConnecting }),
  setLastResponse: (response: ApiResponse | null) =>
    set({ lastResponse: response }),

  // SDK initialization management
  setSdkInitState: (state: Partial<SDKInitializationState>) =>
    set((prevState) => ({
      sdkInitState: { ...prevState.sdkInitState, ...state },
    })),

  updateSdkInitState: (updates: Partial<SDKInitializationState>) =>
    set((prevState) => ({
      sdkInitState: { ...prevState.sdkInitState, ...updates },
    })),

  // Device action management
  setDeviceAction: (action: DeviceActionState) => set({ deviceAction: action }),
  clearDeviceAction: () =>
    set({
      deviceAction: {
        isActive: false,
        actionType: null,
      },
    }),

  addLog: (log: LogEntry) =>
    set((state) => ({
      logs: [...state.logs, log],
    })),

  clearLogs: () => set({ logs: [] }),

  // Device type helpers
  getCurrentDeviceType: () => {
    const state = get();
    return state.currentDevice?.deviceType || null;
  },
  isCurrentDeviceClassicModel: () => {
    const state = get();
    return isClassicModelDevice(state.currentDevice?.deviceType);
  },
  isCurrentDeviceTouchModel: () => {
    const state = get();
    return isTouchModelDevice(state.currentDevice?.deviceType);
  },
  getCurrentDeviceFirmwareVersion: () => {
    const state = get();
    return getDeviceFirmwareVersion(state.deviceFeatures);
  },
  getCurrentDeviceBLEVersion: () => {
    const state = get();
    return getDeviceBLEFirmwareVersion(state.deviceFeatures as Features);
  },
  getCurrentDeviceBootloaderVersion: () => {
    const state = get();
    return getDeviceBootloaderVersion(state.deviceFeatures);
  },
  getCurrentDeviceLabel: () => {
    const state = get();
    return getDeviceLabel(state.deviceFeatures);
  },
  getCurrentDeviceUUID: () => {
    const state = get();
    return state.deviceFeatures ? getDeviceUUID(state.deviceFeatures) : null;
  },
}));
