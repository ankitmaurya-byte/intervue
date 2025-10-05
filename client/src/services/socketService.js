import { io } from "socket.io-client";
import { store } from "../store/store";
import { setConnectionStatus, setSocket } from "../store/slices/socketSlice";
import {
  setPollStatus,
  setStudents,
  setCurrentQuestion,
  setResults,
  updateTimer,
  setError,
} from "../store/slices/pollSlice";

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (this.socket) {
      return this.socket;
    }

    const socketUrl = "https://intervue-be.vercel.app";
    this.socket  = io(socketUrl, {
    path: '/socket.io',
    transports: ['polling'],
    upgrade: false,
    withCredentials: false,
  });

    this.socket.on("connect", () => {
      console.log("Connected to server");

      store.dispatch(setConnectionStatus(true));
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
      store.dispatch(setConnectionStatus(false));
    });

    this.socket.on("userJoined", ({ userType, name, id, students }) => {
      console.log("User joined:", { userType, name, id, students });
      store.dispatch(setStudents(students));
    });

    this.socket.on("pollJoined", (data) => {
      console.log("Joined poll:", data);
      store.dispatch(setSocket(data));
    });

    this.socket.on("newQuestion", (data) => {
      console.log("New question received:", data);
      store.dispatch(setCurrentQuestion(data));
      store.dispatch(setPollStatus("active"));
      store.dispatch(updateTimer(data.timeLimit));

      // Start countdown timer
      this.startTimer(data.timeLimit);
    });

    this.socket.on("answerSubmitted", (data) => {
      console.log("Answer submitted:", data);
      store.dispatch(setResults(data.results));
    });

    this.socket.on("allStudentsAnswered", (data) => {
      console.log("All students answered:", data);
      store.dispatch(setResults(data.results));
      store.dispatch(setPollStatus("waiting"));
    });

    this.socket.on("questionTimeUp", (data) => {
      console.log("Question time up:", data);
      store.dispatch(setResults(data.results));
      store.dispatch(setPollStatus("waiting"));
      store.dispatch(updateTimer(0));
    });

    this.socket.on("questionResults", (data) => {
      console.log("Question results:", data);
      store.dispatch(setResults(data));
    });

    return this.socket;
  }

  joinPoll(userType, studentId = null, name) {
    if (!this.socket) {
      this.connect();
    }

    this.socket.emit("joinPoll", { userType, studentId, name });
  }
  sendChatMessage({ userId, userType, name, text }) {
    const ts = Date.now();
    this.socket.emit("chat:message", { userId, userType, name, text, ts });
  }

  // kick student (teacher only)
  kickStudent(studentId) {
    this.socket.emit("participant:kick", { studentId });
  }
  submitAnswer(studentId, questionId, answer) {
    if (!this.socket) {
      console.error("Socket not connected");
      return;
    }

    this.socket.emit("submitAnswer", { studentId, questionId, answer });
  }

  requestResults(questionId) {
    if (!this.socket) {
      console.error("Socket not connected");
      return;
    }

    this.socket.emit("requestResults", { questionId });
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
    }
  }
}

export default new SocketService();
