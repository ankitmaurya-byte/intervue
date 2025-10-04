import { io } from 'socket.io-client';
import { store } from '../store/store';
import { setSocket, setConnectionStatus, setRoom } from '../store/slices/socketSlice';
import {
  setPollStatus,
  setStudents,
  setCurrentQuestion,
  setResults,
  updateTimer,
  setError,
} from '../store/slices/pollSlice';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (this.socket) {
      return this.socket;
    }

    const socketUrl = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5000';
    this.socket = io(socketUrl);
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      store.dispatch(setSocket(this.socket));
      store.dispatch(setConnectionStatus(true));
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      store.dispatch(setConnectionStatus(false));
    });

    this.socket.on('pollJoined', (data) => {
      console.log('Joined poll:', data);
      store.dispatch(setRoom(data.pollId));
    });

    this.socket.on('newQuestion', (data) => {
      console.log('New question received:', data);
      store.dispatch(setCurrentQuestion(data));
      store.dispatch(setPollStatus('active'));
      store.dispatch(updateTimer(data.timeLimit));
      
      // Start countdown timer
      this.startTimer(data.timeLimit);
    });

    this.socket.on('answerSubmitted', (data) => {
      console.log('Answer submitted:', data);
      store.dispatch(setResults(data.results));
    });

    this.socket.on('allStudentsAnswered', (data) => {
      console.log('All students answered:', data);
      store.dispatch(setResults(data.results));
      store.dispatch(setPollStatus('waiting'));
    });

    this.socket.on('questionTimeUp', (data) => {
      console.log('Question time up:', data);
      store.dispatch(setResults(data.results));
      store.dispatch(setPollStatus('waiting'));
      store.dispatch(updateTimer(0));
    });

    this.socket.on('questionResults', (data) => {
      console.log('Question results:', data);
      store.dispatch(setResults(data));
    });

    return this.socket;
  }

  joinPoll(pollId, userType, studentId = null) {
    if (!this.socket) {
      this.connect();
    }
    
    this.socket.emit('joinPoll', { pollId, userType, studentId });
  }

  submitAnswer(pollId, studentId, questionId, answer) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('submitAnswer', { pollId, studentId, questionId, answer });
  }

  requestResults(pollId, questionId) {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }
    
    this.socket.emit('requestResults', { pollId, questionId });
  }

  startTimer(seconds) {
    let timeLeft = seconds;
    
    const timer = setInterval(() => {
      timeLeft--;
      store.dispatch(updateTimer(timeLeft));
      
      if (timeLeft <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      store.dispatch(setConnectionStatus(false));
      store.dispatch(setRoom(null));
    }
  }
}

export default new SocketService();
