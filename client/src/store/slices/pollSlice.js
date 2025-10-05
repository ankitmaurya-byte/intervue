import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  
  teacherId: null,
  studentId: null,
  studentName: '',
  tabId: null,
  userType: null, // 'teacher' or 'student'
  status: 'waiting', // waiting, active, completed
  students: [],
  currentQuestion: null,
  questions: [],
  results: null,
  timer: 60,
  isConnected: false,
  error: null,
};

const pollSlice = createSlice({
  name: 'poll',
  initialState,
  reducers: {
    setPollData: (state, action) => {
      const { teacherId, studentId, studentName, tabId, userType } = action.payload;
      
      state.teacherId = teacherId;
      state.studentId = studentId;
      state.studentName = studentName;
      state.tabId = tabId;
      state.userType = userType;
    },
    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
    },
    setPollStatus: (state, action) => {
      state.status = action.payload;
    },
    setStudents: (state, action) => {
      state.students = action.payload;
    },
    setCurrentQuestion: (state, action) => {
      state.currentQuestion = action.payload;
      state.timer = 60;
    },
    setQuestions: (state, action) => {
      state.questions = action.payload;
    },
    setResults: (state, action) => {
      state.results = action.payload;
    },
    updateTimer: (state, action) => {
      state.timer = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetPoll: (state) => {
      return { ...initialState, tabId: state.tabId };
    },
  },
});

export const {
  setPollData,
  setConnectionStatus,
  setPollStatus,
  setStudents,
  setCurrentQuestion,
  setQuestions,
  setResults,
  updateTimer,
  setError,
  clearError,
  resetPoll,
} = pollSlice.actions;

export default pollSlice.reducer;
