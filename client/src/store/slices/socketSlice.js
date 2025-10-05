import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: null,
  isConnected: false,

};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setSocket: (state, action) => {
      state.data = action.payload;
    },
    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
    },
   
    disconnect: (state) => {
      if (state.socket) {
        state.socket.disconnect();
      }
      state.socket = null;
      state.isConnected = false;
   
    },
  },
});

export const {
  setConnectionStatus,
  setSocket,
  disconnect,
} = socketSlice.actions;

export default socketSlice.reducer;
