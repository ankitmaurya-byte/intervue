import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  socket: null,
  isConnected: false,
  room: null,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setSocket: (state, action) => {
      state.socket = action.payload;
    },
    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
    },
    setRoom: (state, action) => {
      state.room = action.payload;
    },
    disconnect: (state) => {
      if (state.socket) {
        state.socket.disconnect();
      }
      state.socket = null;
      state.isConnected = false;
      state.room = null;
    },
  },
});

export const {
  setSocket,
  setConnectionStatus,
  setRoom,
  disconnect,
} = socketSlice.actions;

export default socketSlice.reducer;
