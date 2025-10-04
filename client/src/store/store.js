import { configureStore } from '@reduxjs/toolkit';
import pollReducer from './slices/pollSlice';
import socketReducer from './slices/socketSlice';

export const store = configureStore({
  reducer: {
    poll: pollReducer,
    socket: socketReducer,
  },
});
