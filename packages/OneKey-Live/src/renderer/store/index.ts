import { configureStore } from '@reduxjs/toolkit';
import runtime from './reducers/runtime';
import uiResponse from './reducers/ui-response';

export const store = configureStore({
  reducer: {
    runtime,
    uiResponse,
  },
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
