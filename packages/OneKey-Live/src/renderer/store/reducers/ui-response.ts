import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IDeviceType } from '@onekeyfe/hd-core';

export type HardwareUiEventPayload = {
  type: string;
  deviceType: IDeviceType;
  deviceId: string;
  deviceConnectId: string;
};

export type HardwarePopup = {
  uiRequest?: string;
  payload?: HardwareUiEventPayload;
};

type InitialState = {
  event: HardwarePopup | null;
};

const initialState: InitialState = {
  event: null,
};

export const uiResponseSlice = createSlice({
  name: 'uiResponse',
  initialState,
  reducers: {
    setHardwareEvent(state, action: PayloadAction<HardwarePopup>) {
      state.event = action.payload;
    },
  },
});

export const { setHardwareEvent } = uiResponseSlice.actions;

export default uiResponseSlice.reducer;
