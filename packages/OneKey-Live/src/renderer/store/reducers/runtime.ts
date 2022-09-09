import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { KnownDevice } from '@onekeyfe/hd-core';

type InitialState = {
  device: KnownDevice | null;
  methodState: 'empty' | 'processing' | 'success' | 'failed';
};

const initialState: InitialState = {
  device: null,
  methodState: 'empty',
};

export const runtimeSlice = createSlice({
  name: 'runtime',
  initialState,
  reducers: {
    setDevice(state, action: PayloadAction<InitialState['device']>) {
      state.device = action.payload;
    },
    setMethodState(state, action: PayloadAction<InitialState['methodState']>) {
      state.methodState = action.payload;
    },
  },
});

export const { setDevice, setMethodState } = runtimeSlice.actions;

export default runtimeSlice.reducer;
